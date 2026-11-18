package com.parkingdesk.app.plate

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View

/**
 * 카메라 미리보기 위의 가이드 박스. 박스 밖은 어둡게 덮고, 박스 안에서 번호를 읽으면 테두리가 초록.
 *
 * 박스 비율([boxWidthRatio], [boxHeightRatio])은 여기 한 곳에서 정한다. 인식 쪽(ScanActivity)이
 * 같은 값을 읽어 "그려진 박스 = 인식하는 영역"이 되게 한다.
 */
class PlateGuideView(context: Context) : View(context) {

    @Volatile
    var boxWidthRatio = WIDTH_RATIO
        private set

    @Volatile
    var boxHeightRatio = 0.15f
        private set

    private var detected = false

    private val mask = Paint().apply { color = Color.argb(150, 0, 0, 0) }
    private val border = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 6f
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (h > 0) boxHeightRatio = (w * WIDTH_RATIO / ASPECT) / h
    }

    fun setDetected(value: Boolean) {
        if (value == detected) return
        detected = value
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        val bw = w * boxWidthRatio
        val bh = h * boxHeightRatio
        val left = (w - bw) / 2
        val top = (h - bh) / 2
        canvas.drawRect(0f, 0f, w, top, mask)
        canvas.drawRect(0f, top + bh, w, h, mask)
        canvas.drawRect(0f, top, left, top + bh, mask)
        canvas.drawRect(left + bw, top, w, top + bh, mask)
        // 디자인 토큰 --ok(#1f9d57): 판정 "허용"과 같은 초록. 인식됨을 뜻한다.
        border.color = if (detected) Color.rgb(0x1F, 0x9D, 0x57) else Color.WHITE
        canvas.drawRoundRect(left, top, left + bw, top + bh, 16f, 16f, border)
    }

    private companion object {
        const val WIDTH_RATIO = 0.85f

        // 긴 번호판(약 4.7:1)과 짧은 두 줄 번호판(약 2:1) 사이. 둘 다 박스에 들어오게.
        const val ASPECT = 3f
    }
}
