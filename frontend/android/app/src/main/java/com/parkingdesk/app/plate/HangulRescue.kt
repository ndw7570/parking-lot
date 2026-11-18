package com.parkingdesk.app.plate

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Rect
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognizer

/**
 * ML Kit 한국어 모델은 숫자 사이에 낀 한글 한 글자를 영문·기호로 자주 읽는다
 * (2026-11-18 야간 실사진 7장 중 6장: 수->4·+, 보->E·빠짐, 저->1, 루->#). 숫자는 다 맞았다.
 * 한글 자리만 잘라 크게 키워 다시 읽으면 한글로 나와서, 그 글자로 번호를 맞춘다(P005-020).
 *
 * 다시 읽기는 ML Kit 을 한 번 더 부르므로 분석 스레드에서만 쓴다(Tasks.await).
 */
object HangulRescue {

    // 다시 읽을 그림의 글자 높이와 둘레 여백. 작은 그림 하나만 있으면 ML Kit 이 글자로 보지 않는다.
    private const val TARGET_HEIGHT = 160
    private const val MARGIN = 80

    /** 다시 읽을 만한 줄(앞 숫자 묶음 + 뒤 4자리)이 있는지. 없으면 그림 변환을 아예 안 한다. */
    fun hasCandidate(lines: List<Text.Line>): Boolean = lines.any { split(it) != null }

    /** [upright] 는 ML Kit 좌표와 같은(회전 적용된) 장면 그림. */
    fun rescue(lines: List<Text.Line>, upright: Bitmap, recognizer: TextRecognizer): List<String> =
        lines.mapNotNull { line ->
            val parts = split(line) ?: return@mapNotNull null
            val crop = cropUpscaled(upright, parts.hangulArea) ?: return@mapNotNull null
            val reread = Tasks.await(recognizer.process(InputImage.fromBitmap(crop, 0))).text
            PlateParser.compose(parts.front, reread, parts.back)
        }.distinct()

    private class Parts(val front: String, val back: String, val hangulArea: Rect)

    // 첫 묶음이 숫자 2자리 이상, 마지막 묶음이 숫자 4자리인 줄. 한글 자리 = 앞 2번째 숫자 뒤 ~ 뒤 4자리 앞.
    private fun split(line: Text.Line): Parts? {
        val first = line.elements.firstOrNull() ?: return null
        val last = line.elements.lastOrNull() ?: return null
        if (first === last) return null
        val front = first.text.filter(Char::isDigit)
        val back = last.text.filter(Char::isDigit)
        if (front.length !in 2..4 || back.length != 4) return null
        val second = first.symbols.getOrNull(1)?.boundingBox ?: return null
        val lineBox = line.boundingBox ?: return null
        val backBox = last.boundingBox ?: return null
        val pad = lineBox.height() / 6
        val area = Rect(second.right, lineBox.top - pad, backBox.left, lineBox.bottom + pad)
        return Parts(front, back, area)
    }

    private fun cropUpscaled(src: Bitmap, area: Rect): Bitmap? {
        val r = Rect(area)
        if (!r.intersect(0, 0, src.width, src.height) || r.width() < 4 || r.height() < 4) return null
        val crop = Bitmap.createBitmap(src, r.left, r.top, r.width(), r.height())
        val scale = TARGET_HEIGHT.toFloat() / crop.height
        val big = Bitmap.createScaledBitmap(crop, (crop.width * scale).toInt().coerceAtLeast(1), TARGET_HEIGHT, true)
        val out = Bitmap.createBitmap(big.width + MARGIN * 2, big.height + MARGIN * 2, Bitmap.Config.ARGB_8888)
        Canvas(out).apply {
            drawColor(Color.WHITE)
            drawBitmap(big, MARGIN.toFloat(), MARGIN.toFloat(), null)
        }
        return out
    }
}
