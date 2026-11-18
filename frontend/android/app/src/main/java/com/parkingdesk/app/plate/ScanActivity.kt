package com.parkingdesk.app.plate

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * 카메라를 비추면 번호판을 실시간으로 읽고, 확정되면 번호를 돌려주고 닫힌다.
 * 결과: RESULT_OK + [EXTRA_PLATE]. 사용자가 닫으면 RESULT_CANCELED.
 * 권한 요청은 호출하는 쪽(PlateScannerPlugin)이 끝낸 뒤에 연다.
 */
class ScanActivity : AppCompatActivity() {

    private lateinit var previewView: PreviewView
    private lateinit var analysisExecutor: ExecutorService
    private val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
    private val stabilizer = PlateStabilizer()

    // 확정 직후에도 몇 장면이 더 분석될 수 있다. 결과를 한 번만 돌려준다.
    @Volatile
    private var finished = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        previewView = PreviewView(this)
        setContentView(buildLayout())
        analysisExecutor = Executors.newSingleThreadExecutor()
        startCamera()
    }

    // 레이아웃 XML 을 따로 두지 않는다. 화면이 미리보기 + 안내 + 닫기 셋뿐이다.
    private fun buildLayout(): FrameLayout {
        val hint = TextView(this).apply {
            text = "번호판을 화면 가운데에 맞춰 주세요"
            setTextColor(Color.WHITE)
            textSize = 16f
            gravity = Gravity.CENTER
        }
        val close = Button(this).apply {
            text = "직접 입력"
            setOnClickListener { finish() }
        }
        val bottom = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.argb(160, 7, 26, 58))
            setPadding(32, 32, 32, 48)
            addView(hint)
            addView(close)
        }
        return FrameLayout(this).apply {
            addView(previewView, FrameLayout.LayoutParams(MATCH, MATCH))
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
            // 분석이 밀리면 오래된 장면은 버린다. 실시간 인식에서는 최신 장면만 의미가 있다.
            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .apply { setAnalyzer(analysisExecutor, ::analyze) }
            provider.unbindAll()
            provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
        }, ContextCompat.getMainExecutor(this))
    }

    @OptIn(ExperimentalGetImage::class)
    private fun analyze(proxy: ImageProxy) {
        val media = proxy.image
        if (media == null || finished) {
            proxy.close()
            return
        }
        val input = InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees)
        recognizer.process(input)
            .addOnSuccessListener { text ->
                val lines = text.textBlocks.flatMap { block -> block.lines.map { it.text } }
                stabilizer.feed(PlateParser.findPlates(lines))?.let(::finishWith)
            }
            // 장면을 닫아야 다음 장면이 들어온다. 실패해도 닫는다.
            .addOnCompleteListener { proxy.close() }
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
    }
}
