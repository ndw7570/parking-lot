package com.parkingdesk.app.plate

/**
 * 야간 플래시 자동 켜기 판단.
 *
 * - 평균 밝기가 [darkLuma] 미만인 장면이 [darkFrames] 번 이어지면 켠다.
 * - 켠 뒤에는 밝아져도 스스로 끄지 않는다. 플래시가 장면을 밝히므로 밝기로 끄면 깜빡인다.
 * - 사용자가 직접 켜거나 끄면 그 선택을 따르고 자동 판단은 멈춘다. 반사 재질 번호판은
 *   플래시에 번들거려 못 읽을 수 있어, 끄는 길을 남겨 둔다.
 */
class AutoTorch(
    private val darkLuma: Int = 50,
    private val darkFrames: Int = 10,
) {
    private var darkStreak = 0
    private var on = false
    private var manual = false

    /** 장면 밝기를 넣으면 플래시가 켜져 있어야 하는지 돌려준다. */
    fun onFrame(luma: Int): Boolean {
        if (manual || on) return on
        darkStreak = if (luma < darkLuma) darkStreak + 1 else 0
        if (darkStreak >= darkFrames) on = true
        return on
    }

    fun setManual(enabled: Boolean) {
        manual = true
        on = enabled
    }

    companion object {
        /**
         * Y(밝기) 평면의 평균. [step] 칸마다 하나씩만 봐서 장면마다 부담을 줄인다.
         * 바이트는 부호 없는 값(0~255)으로 읽는다.
         */
        fun averageLuma(y: ByteArray, width: Int, height: Int, rowStride: Int, step: Int = 8): Int {
            var sum = 0L
            var count = 0
            for (row in 0 until height step step) {
                for (col in 0 until width step step) {
                    sum += y[row * rowStride + col].toInt() and 0xFF
                    count++
                }
            }
            return if (count == 0) 0 else (sum / count).toInt()
        }
    }
}
