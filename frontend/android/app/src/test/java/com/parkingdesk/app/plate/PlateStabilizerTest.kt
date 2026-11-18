package com.parkingdesk.app.plate

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// P005-011: 한 장면의 오인식으로 확정하지 않는다. 최근 장면 여러 장에서 같은 번호가 나와야 확정.
class PlateStabilizerTest {

    @Test
    fun `confirms after enough hits within the window`() {
        val s = PlateStabilizer(window = 5, required = 3)

        assertNull(s.feed(listOf("12가3456")))
        assertNull(s.feed(emptyList()))
        assertNull(s.feed(listOf("12가3456")))
        assertEquals("12가3456", s.feed(listOf("12가3456")))
    }

    @Test
    fun `forgets hits that slid out of the window`() {
        val s = PlateStabilizer(window = 3, required = 2)

        s.feed(listOf("12가3456"))
        s.feed(emptyList())
        s.feed(emptyList())

        assertNull(s.feed(listOf("12가3456")))
    }

    @Test
    fun `a one-off misread does not win`() {
        val s = PlateStabilizer(window = 5, required = 3)

        s.feed(listOf("12가3456"))
        s.feed(listOf("12가3458"))
        s.feed(listOf("12가3456"))

        assertEquals("12가3456", s.feed(listOf("12가3456")))
    }
}
