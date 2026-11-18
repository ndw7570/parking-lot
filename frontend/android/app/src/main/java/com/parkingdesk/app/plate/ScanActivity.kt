package com.parkingdesk.app.plate

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.util.Size
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
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
    private lateinit var torchButton: Button
    private lateinit var statusText: TextView
    private lateinit var debugText: TextView
    private lateinit var analysisExecutor: ExecutorService
    private val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
    private val stabilizer = PlateStabilizer()

    // 분석 스레드와 버튼(메인 스레드)이 같이 만진다. 접근은 synchronized(autoTorch) 로.
    private val autoTorch = AutoTorch()
    private var camera: Camera? = null

    @Volatile
    private var torchOn = false

    // 확정 직후에도 몇 장면이 더 분석될 수 있다. 결과를 한 번만 돌려준다.
    @Volatile
    private var finished = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        previewView = PreviewView(this)
        guide = PlateGuideView(this)
        setContentView(buildLayout())
        analysisExecutor = Executors.newSingleThreadExecutor()
        // viewPort 는 미리보기 화면이 배치된 뒤에야 생긴다.
        previewView.post { startCamera() }
    }

    // 레이아웃 XML 을 따로 두지 않는다. 미리보기 + 가이드 박스 + 아래 안내·버튼뿐이다.
    private fun buildLayout(): FrameLayout {
        val hint = TextView(this).apply {
            text = "번호판을 박스 안에 맞춰 주세요"
            setTextColor(Color.WHITE)
            textSize = 16f
            gravity = Gravity.CENTER
        }
        // 지금 무엇을 읽고 있는지 보여 준다. 사용자는 맞추는 데 도움을 받고, 현장 시험 때는
        // "왜 확정이 안 되나"(박스 밖에서만 읽힘 / 글자는 읽히는데 번호판 형식이 아님)를 바로 알 수 있다.
        statusText = TextView(this).apply {
            setTextColor(Color.WHITE)
            textSize = 15f
            gravity = Gravity.CENTER
            setPadding(0, 12, 0, 0)
        }
        debugText = TextView(this).apply {
            setTextColor(Color.argb(170, 255, 255, 255))
            textSize = 11f
            gravity = Gravity.CENTER
        }
        torchButton = Button(this).apply {
            text = TORCH_OFF_LABEL
            visibility = View.GONE // 플래시가 있는 기기에서만 보인다
            setOnClickListener { toggleTorchByUser() }
        }
        val close = Button(this).apply {
            text = "직접 입력"
            setOnClickListener { finish() }
        }
        val buttons = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            addView(torchButton)
            addView(close)
        }
        val bottom = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.argb(160, 7, 26, 58))
            setPadding(32, 32, 32, 48)
            // Android 15 부터 앱이 내비게이션 바 밑까지 그린다. 버튼이 가려지지 않게 그 높이만큼 올린다.
            ViewCompat.setOnApplyWindowInsetsListener(this) { v, insets ->
                val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
                v.setPadding(32, 32, 32, 48 + bars.bottom)
                insets
            }
            addView(hint)
            addView(statusText)
            addView(debugText)
            addView(buttons)
        }
        return FrameLayout(this).apply {
            addView(previewView, FrameLayout.LayoutParams(MATCH, MATCH))
            addView(guide, FrameLayout.LayoutParams(MATCH, MATCH))
            addView(bottom, FrameLayout.LayoutParams(MATCH, WRAP, Gravity.BOTTOM))
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
            if (camera?.cameraInfo?.hasFlashUnit() == true) torchButton.visibility = View.VISIBLE
        }, ContextCompat.getMainExecutor(this))
    }

    @OptIn(ExperimentalGetImage::class)
    private fun analyze(proxy: ImageProxy) {
        val media = proxy.image
        if (media == null || finished) {
            proxy.close()
            return
        }
        val wantTorch = synchronized(autoTorch) { autoTorch.onFrame(lumaOf(proxy)) }
        if (wantTorch != torchOn) runOnUiThread { applyTorch(wantTorch) }

        val roi = guideBoxInImage(proxy)
        val rotation = proxy.imageInfo.rotationDegrees
        val size = "${proxy.width}x${proxy.height}"
        val input = InputImage.fromMediaImage(media, rotation)
        recognizer.process(input)
            .addOnSuccessListener { text ->
                val all = text.textBlocks.flatMap { it.lines }
                // 박스 밖 글자(간판, 다른 차 번호)는 버린다.
                val inside = all.filter { isInside(it, roi) }.map { it.text }
                val candidates = PlateParser.findPlates(inside)
                val confirmed = stabilizer.feed(candidates)
                guide.setDetected(candidates.isNotEmpty())
                showProgress(inside, candidates, all.size)
                Log.d(TAG, "image=$size rot=$rotation roi=$roi all=${all.map { it.text }} inside=$inside plates=$candidates")
                confirmed?.let(::finishWith)
            }
            // 장면을 닫아야 다음 장면이 들어온다. 실패해도 닫는다.
            .addOnCompleteListener { proxy.close() }
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

    private fun showProgress(inside: List<String>, candidates: List<String>, total: Int) {
        val leader = stabilizer.leader()
        statusText.text = when {
            leader != null && candidates.isNotEmpty() ->
                "${leader.first} 확인 중 (${leader.second}/${stabilizer.requiredHits})"
            inside.isNotEmpty() -> "글자 인식: " + inside.joinToString(" ").take(24)
            else -> ""
        }
        // 현장 시험용 진단: 전체는 읽히는데 박스 안이 계속 0이면 박스 위치 계산 문제다.
        debugText.text = "박스 안 ${inside.size}줄 / 전체 ${total}줄"
    }

    private fun lumaOf(proxy: ImageProxy): Int {
        val plane = proxy.planes[0]
        val buffer = plane.buffer.duplicate().apply { rewind() }
        val bytes = ByteArray(buffer.remaining()).also { buffer.get(it) }
        return AutoTorch.averageLuma(bytes, proxy.width, proxy.height, plane.rowStride)
    }

    private fun toggleTorchByUser() {
        val next = !torchOn
        synchronized(autoTorch) { autoTorch.setManual(next) }
        applyTorch(next)
    }

    private fun applyTorch(on: Boolean) {
        if (on == torchOn) return
        if (camera?.cameraInfo?.hasFlashUnit() != true) return
        torchOn = on
        camera?.cameraControl?.enableTorch(on)
        torchButton.text = if (on) TORCH_ON_LABEL else TORCH_OFF_LABEL
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
        private const val MATCH = FrameLayout.LayoutParams.MATCH_PARENT
        private const val WRAP = FrameLayout.LayoutParams.WRAP_CONTENT
        private const val TORCH_OFF_LABEL = "플래시 켜기"
        private const val TORCH_ON_LABEL = "플래시 끄기"
        private const val TAG = "PlateScan"
    }
}
