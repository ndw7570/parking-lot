package com.parkingdesk.app.plate

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.Bundle
import android.util.Log
import android.util.Size
import android.view.View
import android.widget.ImageButton
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.UseCaseGroup
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.parkingdesk.app.R
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * 카메라를 비추면 가이드 박스 안의 번호판을 실시간으로 읽고, 확정되면 번호를 돌려주고 닫힌다.
 * 결과: RESULT_OK + [EXTRA_PLATE]. 사용자가 닫으면 RESULT_CANCELED.
 * 권한 요청은 호출하는 쪽(PlateScannerPlugin)이 끝낸 뒤에 연다.
 */
class ScanActivity : AppCompatActivity() {

    private lateinit var previewView: PreviewView
    private lateinit var guide: PlateGuideView
    private lateinit var torchButton: ImageButton
    private lateinit var torchAutoBadge: TextView
    private lateinit var analysisExecutor: ExecutorService
    private val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
    private val stabilizer = PlateStabilizer()

    // 분석 스레드와 버튼(메인 스레드)이 같이 만진다. 접근은 synchronized(autoTorch) 로.
    private val autoTorch = AutoTorch()
    private var camera: Camera? = null

    @Volatile
    private var torchOn = false

    // 사용자가 플래시를 한 번이라도 직접 누르면 "자동" 표시를 내린다(AutoTorch 도 자동 판단을 멈춘다).
    private var torchManual = false

    // 확정 직후에도 몇 장면이 더 분석될 수 있다. 결과를 한 번만 돌려준다.
    @Volatile
    private var finished = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_scan)
        previewView = findViewById(R.id.preview)
        guide = findViewById(R.id.guide)
        torchButton = findViewById(R.id.torch)
        torchAutoBadge = findViewById(R.id.torch_auto)
        torchButton.setOnClickListener { toggleTorchByUser() }
        findViewById<View>(R.id.close).setOnClickListener { finish() }
        findViewById<View>(R.id.manual).setOnClickListener { finish() }
        avoidSystemBars()
        analysisExecutor = Executors.newSingleThreadExecutor()
        // viewPort 는 미리보기 화면이 배치된 뒤에야 생긴다.
        previewView.post { startCamera() }
    }

    // Android 15 부터 앱이 상태바·내비게이션 바 밑까지 그린다. 위아래 버튼을 그 높이만큼 안쪽으로.
    private fun avoidSystemBars() {
        val top = findViewById<View>(R.id.top_bar)
        val bottom = findViewById<View>(R.id.bottom_bar)
        val topPad = top.paddingTop
        val bottomPad = bottom.paddingBottom
        ViewCompat.setOnApplyWindowInsetsListener(top.rootView) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            top.setPadding(top.paddingLeft, topPad + bars.top, top.paddingRight, top.paddingBottom)
            bottom.setPadding(bottom.paddingLeft, bottom.paddingTop, bottom.paddingRight, bottomPad + bars.bottom)
            insets
        }
    }

    private fun startCamera() {
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            val provider = future.get()
            val preview = Preview.Builder().build().apply {
                setSurfaceProvider(previewView.surfaceProvider)
            }
            // 번호판 글자가 읽히도록 분석 해상도를 720p 근처로. 밀린 장면은 버린다(최신만 의미 있음).
            val analysis = ImageAnalysis.Builder()
                .setResolutionSelector(
                    ResolutionSelector.Builder()
                        .setResolutionStrategy(
                            ResolutionStrategy(
                                Size(1280, 720),
                                ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER,
                            ),
                        )
                        .build(),
                )
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .apply { setAnalyzer(analysisExecutor, ::analyze) }
            // 같은 viewPort 로 묶어야 분석 이미지의 cropRect 가 "화면에 보이는 영역"과 같아진다.
            // 그래야 화면의 가이드 박스 비율을 그대로 분석 좌표에 쓸 수 있다.
            val group = UseCaseGroup.Builder()
                .addUseCase(preview)
                .addUseCase(analysis)
                .apply { previewView.viewPort?.let(::setViewPort) }
                .build()
            provider.unbindAll()
            camera = provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, group)
            if (camera?.cameraInfo?.hasFlashUnit() == true) {
                torchButton.visibility = View.VISIBLE
                updateTorchUi()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    // 분석 스레드에서 끝까지 기다리며 처리한다. 한글 다시 읽기(HangulRescue)가 장면 그림을 써야 해서
    // 장면을 닫기 전에 두 번째 인식까지 마쳐야 한다. 장면을 닫아야 다음 장면이 들어온다 - 실패해도 닫는다.
    @OptIn(ExperimentalGetImage::class)
    private fun analyze(proxy: ImageProxy) {
        try {
            val media = proxy.image ?: return
            if (finished) return
            val wantTorch = synchronized(autoTorch) { autoTorch.onFrame(lumaOf(proxy)) }
            if (wantTorch != torchOn) runOnUiThread { applyTorch(wantTorch) }

            val roi = guideBoxInImage(proxy)
            val rotation = proxy.imageInfo.rotationDegrees
            val text = Tasks.await(recognizer.process(InputImage.fromMediaImage(media, rotation)))
            val all = text.textBlocks.flatMap { it.lines }
            // 박스 밖 글자(간판, 다른 차 번호)는 버린다.
            val insideLines = all.filter { isInside(it, roi) }
            val inside = insideLines.map { it.text }
            val direct = PlateParser.findPlates(inside)
            val candidates = direct.ifEmpty {
                val upright = if (HangulRescue.hasCandidate(insideLines)) uprightBitmap(proxy) else null
                upright?.let { HangulRescue.rescue(insideLines, it, recognizer) }.orEmpty()
            }
            val confirmed = stabilizer.feed(candidates)
            val status = progressText(inside, candidates)
            Log.d(TAG, "image=${proxy.width}x${proxy.height} rot=$rotation roi=$roi all=${all.map { it.text }} inside=$inside direct=$direct plates=$candidates")
            runOnUiThread {
                guide.setDetected(candidates.isNotEmpty())
                guide.setStatus(status)
                confirmed?.let(::finishWith)
            }
        } catch (e: Exception) {
            Log.w(TAG, "analyze failed", e)
        } finally {
            proxy.close()
        }
    }

    // ML Kit 좌표는 회전을 적용한 그림 기준이라 그림도 같은 방향으로 세운다.
    // 크기가 장면과 다르면(기기마다 변환 방식이 다를 수 있음) 좌표가 어긋나므로 다시 읽기를 건너뛴다.
    private fun uprightBitmap(proxy: ImageProxy): Bitmap? {
        val raw = proxy.toBitmap()
        if (raw.width != proxy.width || raw.height != proxy.height) {
            Log.w(TAG, "bitmap ${raw.width}x${raw.height} != image ${proxy.width}x${proxy.height}, skip rescue")
            return null
        }
        val degrees = proxy.imageInfo.rotationDegrees
        if (degrees == 0) return raw
        val turn = Matrix().apply { postRotate(degrees.toFloat()) }
        return Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, turn, true)
    }

    /** 화면의 가이드 박스를 ML Kit 좌표(회전 적용된 이미지)로. */
    private fun guideBoxInImage(proxy: ImageProxy): Box {
        val c = proxy.cropRect
        val visible = PlateRoi.uprightCrop(
            Box(c.left, c.top, c.right, c.bottom),
            proxy.width,
            proxy.height,
            proxy.imageInfo.rotationDegrees,
        )
        return PlateRoi.inVisible(visible, guide.boxWidthRatio, guide.boxHeightRatio)
    }

    private fun isInside(line: Text.Line, roi: Box): Boolean {
        val b = line.boundingBox ?: return false
        return PlateRoi.contains(roi, Box(b.left, b.top, b.right, b.bottom))
    }

    // 박스 아래 진행 문구. 읽은 원문은 로그(PlateScan)에만 남기고 화면에는 사용자 말로.
    // stabilizer 는 분석 스레드에서만 만진다. 문구는 거기서 만들어 화면 스레드로 넘긴다.
    private fun progressText(inside: List<String>, candidates: List<String>): String {
        val leader = stabilizer.leader()
        return when {
            leader != null && candidates.isNotEmpty() ->
                "${leader.first}  확인 중 ${leader.second}/${stabilizer.requiredHits}"
            inside.isNotEmpty() -> "번호판을 찾는 중…"
            else -> ""
        }
    }

    private fun lumaOf(proxy: ImageProxy): Int {
        val plane = proxy.planes[0]
        val buffer = plane.buffer.duplicate().apply { rewind() }
        val bytes = ByteArray(buffer.remaining()).also { buffer.get(it) }
        return AutoTorch.averageLuma(bytes, proxy.width, proxy.height, plane.rowStride)
    }

    private fun toggleTorchByUser() {
        val next = !torchOn
        torchManual = true
        synchronized(autoTorch) { autoTorch.setManual(next) }
        applyTorch(next)
        updateTorchUi()
    }

    private fun applyTorch(on: Boolean) {
        if (on == torchOn) return
        if (camera?.cameraInfo?.hasFlashUnit() != true) return
        torchOn = on
        camera?.cameraControl?.enableTorch(on)
        updateTorchUi()
    }

    // 아이콘으로 켜짐/꺼짐, 아래 "자동" 표시로 자동 판단 중임을 보인다.
    private fun updateTorchUi() {
        torchButton.setImageResource(if (torchOn) R.drawable.ic_flash_on else R.drawable.ic_flash_off)
        torchButton.contentDescription = if (torchOn) "플래시 끄기" else "플래시 켜기"
        torchAutoBadge.visibility = if (torchManual) View.GONE else View.VISIBLE
    }

    private fun finishWith(plate: String) {
        if (finished) return
        finished = true
        setResult(RESULT_OK, Intent().putExtra(EXTRA_PLATE, plate))
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        analysisExecutor.shutdown()
        recognizer.close()
    }

    companion object {
        const val EXTRA_PLATE = "plate"
        private const val TAG = "PlateScan"
    }
}
