package com.parkingdesk.app.plate

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Rect
import android.util.Log
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
    private const val TAG = "PlateScan"

    // 두 묶음 사이 틈이 글자 몇 개 너비 이상이면 한글을 빠뜨린 것으로 본다. 값은 실사진 측정으로 정했다(아래 P005 기록).
    // 실측(2026-11-20, 사진 11장): 빠뜨림 1.74~2.36, 한글을 숫자·기호로 읽음 0.95 이하~1.31.
    private const val DROPPED_GAP = 1.5f

    // 틈만 자르면 한글 가장자리가 잘려 못 읽은 적이 있다(157 7839). 양옆으로 글자 너비의 이만큼 넓힌다.
    private const val GAP_WIDEN = 0.3f

    /** 다시 읽을 만한 줄(앞 숫자 묶음 + 뒤 4자리)이 있는지. 없으면 그림 변환을 아예 안 한다. */
    fun hasCandidate(lines: List<Text.Line>): Boolean = lines.any { split(it).isNotEmpty() }

    /**
     * [upright] 는 ML Kit 좌표와 같은(회전 적용된) 장면 그림.
     * 빠뜨림으로 본 줄도 틈 다시 읽기에 실패하면 원래 방식(2번째 숫자 뒤부터)으로 한 번 더 본다.
     */
    fun rescue(lines: List<Text.Line>, upright: Bitmap, recognizer: TextRecognizer): List<String> =
        lines.mapNotNull { line ->
            split(line).firstNotNullOfOrNull { parts ->
                val crop = cropUpscaled(upright, parts.hangulArea) ?: return@firstNotNullOfOrNull null
                val reread = Tasks.await(recognizer.process(InputImage.fromBitmap(crop, 0))).text
                PlateParser.compose(parts.front, reread, parts.back, parts.hangulDropped).also {
                    Log.d(TAG, "rescue line=${line.text} gapMode=${parts.hangulDropped} reread=${reread.lines().joinToString(" ")} -> $it")
                }
            }
        }.distinct()

    private class Parts(val front: String, val back: String, val hangulArea: Rect, val hangulDropped: Boolean)

    // 첫 묶음이 숫자 2자리 이상, 마지막 묶음이 숫자 4자리인 줄.
    // 한글을 아예 빠뜨렸으면 두 묶음 사이에 글자 하나만큼 빈 틈이 있다 -> 앞 숫자를 다 믿고 틈만 다시 읽는다.
    // 그 밖(한글을 숫자·기호로 읽음)은 한글 자리 = 앞 2번째 숫자 뒤 ~ 뒤 4자리 앞.
    // 틈을 안 보면 "199 7124" 에서 3번째 9 가 다시 읽기 영역에 들어갔다가 떨어져 19버7124 가 된다(2026-11-20 실사진).
    private fun split(line: Text.Line): List<Parts> {
        val first = line.elements.firstOrNull() ?: return emptyList()
        val last = line.elements.lastOrNull() ?: return emptyList()
        if (first === last) return emptyList()
        val front = first.text.filter(Char::isDigit)
        val back = last.text.filter(Char::isDigit)
        if (front.length !in 2..4 || back.length != 4) return emptyList()
        val second = first.symbols.getOrNull(1)?.boundingBox ?: return emptyList()
        val lineBox = line.boundingBox ?: return emptyList()
        val frontBox = first.boundingBox ?: return emptyList()
        val backBox = last.boundingBox ?: return emptyList()
        val pad = lineBox.height() / 6
        val usual = Parts(front, back, Rect(second.right, lineBox.top - pad, backBox.left, lineBox.bottom + pad), false)
        val gap = gapRatio(line) ?: 0f
        if (front.length !in 2..3 || !first.text.all(Char::isDigit) || gap < DROPPED_GAP) return listOf(usual)
        val widen = (frontBox.width().toFloat() / first.text.length * GAP_WIDEN).toInt()
        val gapArea = Rect(frontBox.right - widen, lineBox.top - pad, backBox.left + widen, lineBox.bottom + pad)
        return listOf(Parts(front, back, gapArea, true), usual)
    }

    /** 번호판 폭(앞 묶음 왼쪽 ~ 뒤 묶음 오른쪽) / 뒤 4자리의 숫자 1개 폭. 진단용. */
    fun widthInDigits(line: Text.Line): Float? {
        val first = line.elements.firstOrNull() ?: return null
        val last = line.elements.lastOrNull() ?: return null
        if (first === last) return null
        val frontBox = first.boundingBox ?: return null
        val backBox = last.boundingBox ?: return null
        val digit = backBox.width() / 4f
        return (backBox.right - frontBox.left) / digit
    }

    /** 앞 묶음과 뒤 묶음 사이 틈 / 앞 묶음 글자 평균 너비. 진단 테스트(NightPhotoProbe)도 쓴다. */
    fun gapRatio(line: Text.Line): Float? {
        val first = line.elements.firstOrNull() ?: return null
        val last = line.elements.lastOrNull() ?: return null
        val frontBox = first.boundingBox ?: return null
        val backBox = last.boundingBox ?: return null
        if (first === last || first.text.isEmpty()) return null
        val charWidth = frontBox.width().toFloat() / first.text.length
        return (backBox.left - frontBox.right) / charWidth
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
