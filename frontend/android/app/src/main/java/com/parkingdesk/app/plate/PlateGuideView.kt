package com.parkingdesk.app.plate

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.View

/**
 * 카메라 미리보기 위의 가이드 박스.
 * - 박스 밖은 어둡게, 박스는 네 모서리 꺾쇠(스캔 앱에서 익숙한 모양). 읽히면 꺾쇠가 초록.
 * - 박스 위에 안내 문구, 박스 아래에 진행 상태(알약 모양)를 직접 그린다. 박스 위치와 항상 붙어 있게.
 *
 * 박스 비율([boxWidthRatio], [boxHeightRatio])은 여기 한 곳에서 정한다. 인식 쪽(ScanActivity)이
 * 같은 값을 읽어 "그려진 박스 = 인식하는 영역"이 되게 한다.
 */
class PlateGuideView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {

    @Volatile
    var boxWidthRatio = WIDTH_RATIO
        private set

    @Volatile
    var boxHeightRatio = 0.15f
        private set

    private var detected = false
    private var status = ""

    private val dp = resources.displayMetrics.density
    private val box = RectF()

    private val mask = Paint().apply { color = Color.argb(150, 0, 0, 0) }
    private val corner = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 4 * dp
        strokeCap = Paint.Cap.ROUND
    }
    private val hint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 17 * dp
        textAlign = Paint.Align.CENTER
        typeface = Typeface.DEFAULT_BOLD
        setShadowLayer(4 * dp, 0f, 1 * dp, Color.argb(160, 0, 0, 0))
    }
    private val statusText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 14 * dp
        textAlign = Paint.Align.CENTER
        typeface = Typeface.DEFAULT_BOLD
    }
    private val statusPill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(200, 7, 26, 58) }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (h > 0) boxHeightRatio = (w * WIDTH_RATIO / ASPECT) / h
    }

    fun setDetected(value: Boolean) {
        if (value == detected) return
        detected = value
        invalidate()
    }

    /** 박스 아래 진행 문구. 빈 문자열이면 숨긴다. */
    fun setStatus(value: String) {
        if (value == status) return
        status = value
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        val bw = w * boxWidthRatio
        val bh = h * boxHeightRatio
        box.set((w - bw) / 2, (h - bh) / 2, (w + bw) / 2, (h + bh) / 2)

        canvas.drawRect(0f, 0f, w, box.top, mask)
        canvas.drawRect(0f, box.bottom, w, h, mask)
        canvas.drawRect(0f, box.top, box.left, box.bottom, mask)
        canvas.drawRect(box.right, box.top, w, box.bottom, mask)

        drawCorners(canvas)
        canvas.drawText(HINT, w / 2, box.top - 20 * dp, hint)
        if (status.isNotEmpty()) drawStatus(canvas, w / 2, box.bottom + 28 * dp)
    }

    private fun drawCorners(canvas: Canvas) {
        // 디자인 토큰 ok(#1f9d57): 판정 "허용"과 같은 초록이 "읽혔다"를 뜻한다.
        corner.color = if (detected) Color.rgb(0x1F, 0x9D, 0x57) else Color.WHITE
        val len = minOf(28 * dp, box.height() / 2)
        with(box) {
            canvas.drawLine(left, top, left + len, top, corner)
            canvas.drawLine(left, top, left, top + len, corner)
            canvas.drawLine(right, top, right - len, top, corner)
            canvas.drawLine(right, top, right, top + len, corner)
            canvas.drawLine(left, bottom, left + len, bottom, corner)
            canvas.drawLine(left, bottom, left, bottom - len, corner)
            canvas.drawLine(right, bottom, right - len, bottom, corner)
            canvas.drawLine(right, bottom, right, bottom - len, corner)
        }
    }

    private fun drawStatus(canvas: Canvas, cx: Float, top: Float) {
        val textWidth = statusText.measureText(status)
        val padX = 14 * dp
        val pill = RectF(cx - textWidth / 2 - padX, top, cx + textWidth / 2 + padX, top + 32 * dp)
        canvas.drawRoundRect(pill, 16 * dp, 16 * dp, statusPill)
        val baseline = pill.centerY() - (statusText.descent() + statusText.ascent()) / 2
        canvas.drawText(status, cx, baseline, statusText)
    }

    private companion object {
        const val WIDTH_RATIO = 0.85f

        // 긴 번호판(약 4.7:1)과 짧은 두 줄 번호판(약 2:1) 사이. 둘 다 박스에 들어오게.
        const val ASPECT = 3f
        const val HINT = "번호판을 박스 안에 맞춰 주세요"
    }
}
