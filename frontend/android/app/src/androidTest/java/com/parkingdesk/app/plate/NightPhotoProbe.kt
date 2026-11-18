package com.parkingdesk.app.plate

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import org.junit.Test
import org.junit.runner.RunWith

/**
 * 진단 전용(P005-020): assets/night/ 의 실사진을 실제 ML Kit + 앱과 같은 판정(PlateParser, HangulRescue)에
 * 넣어 결과를 로그(PlateProbe)로 본다. 사진은 개인정보라 저장소에 올리지 않는다(.gitignore) - 없으면 그냥 통과.
 * 실행: gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.parkingdesk.app.plate.NightPhotoProbe
 */
@RunWith(AndroidJUnit4::class)
class NightPhotoProbe {
    @Test
    fun probe() {
        val ctx = InstrumentationRegistry.getInstrumentation().context
        val names = ctx.assets.list("night").orEmpty().sorted()
        val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        for (name in names) {
            val full = ctx.assets.open("night/$name").use(BitmapFactory::decodeStream)
            // 실시간 분석 장면은 720x1280 근처라 그 크기로 줄인 것도 본다.
            val scale = 1280f / maxOf(full.width, full.height)
            val live = Bitmap.createScaledBitmap(full, (full.width * scale).toInt(), (full.height * scale).toInt(), true)
            for ((label, bmp) in listOf("full" to full, "live" to live)) {
                val lines = Tasks.await(recognizer.process(InputImage.fromBitmap(bmp, 0))).textBlocks.flatMap { it.lines }
                val direct = PlateParser.findPlates(lines.map { it.text })
                val rescued = if (direct.isEmpty()) HangulRescue.rescue(lines, bmp, recognizer) else emptyList()
                Log.i("PlateProbe", "$name $label direct=$direct rescued=$rescued lines=${lines.map { it.text }}")
            }
        }
    }
}
