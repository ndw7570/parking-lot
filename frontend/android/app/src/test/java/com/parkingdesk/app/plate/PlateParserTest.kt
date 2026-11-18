package com.parkingdesk.app.plate

import org.junit.Assert.assertEquals
import org.junit.Test

// P005-011: OCR 이 읽은 글줄에서 한국 번호판만 골라낸다.
class PlateParserTest {

    private fun parse(vararg lines: String) = PlateParser.findPlates(lines.toList())

    @Test
    fun `reads a new style plate`() {
        assertEquals(listOf("12가3456"), parse("12가3456"))
    }

    @Test
    fun `reads a 3 digit plate with spaces`() {
        assertEquals(listOf("123가4567"), parse("123 가 4567"))
    }

    @Test
    fun `drops the region of an old style plate so lookup matches either way`() {
        assertEquals(listOf("12가3456"), parse("서울12가3456"))
    }

    @Test
    fun `joins a two line plate`() {
        assertEquals(listOf("12가3456"), parse("서울12", "가3456"))
    }

    @Test
    fun `fixes latin look-alikes OCR puts in digit positions`() {
        assertEquals(listOf("12가3456"), parse("I2가34S6"))
    }

    @Test
    fun `ignores phone numbers and other text`() {
        assertEquals(emptyList<String>(), parse("전화 010-1234-5678", "주차금지"))
    }

    @Test
    fun `rejects hangul that never appears on plates`() {
        assertEquals(emptyList<String>(), parse("12꽑3456"))
    }

    @Test
    fun `does not cut a plate out of a longer digit run`() {
        assertEquals(emptyList<String>(), parse("9123가4567"))
    }

    @Test
    fun `returns each plate once`() {
        assertEquals(listOf("12가3456"), parse("12가3456", "12가 3456"))
    }
}
