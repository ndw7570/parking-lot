package com.parkingdesk.app.plate

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// P005-020: 숫자 사이 한글을 잘못 읽은 줄은 한글 자리만 다시 읽어 맞춘다.
// 입력은 2026-11-18 야간 실사진 7장을 ML Kit 에 넣어 나온 실제 값이다.
class PlateComposeTest {

    @Test
    fun `2 digit front - reread holds only the hangul`() {
        // "184 0502": 수를 4로 읽었다
        assertEquals("18수0502", PlateParser.compose("184", "수", "0502"))
    }

    @Test
    fun `3 digit front - reread starts with the 3rd digit`() {
        // "157 7839": 보를 빠뜨렸다. 2번째 숫자 뒤부터 자르면 "7보"
        assertEquals("157보7839", PlateParser.compose("157", "7보", "7839"))
        // "1051 2079": 저를 1로 읽었다
        assertEquals("105저2079", PlateParser.compose("1051", "5저", "2079"))
    }

    @Test
    fun `ignores noise around the reread`() {
        assertEquals("123루5005", PlateParser.compose("123", " 3 루\n", "5005"))
    }

    @Test
    fun `gives up when the reread has no plate hangul`() {
        assertNull(PlateParser.compose("1051", "제", "2079"))
        assertNull(PlateParser.compose("184", "", "0502"))
    }

    @Test
    fun `gives up when the front is too short for the reread`() {
        assertNull(PlateParser.compose("18", "8수", "0502"))
    }
}
