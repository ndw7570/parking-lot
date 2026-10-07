from rest_framework.response import Response

def success_response(data, message="", many=False):
    """다건/단건 공통 응답 포멧"""
    if many:
        return Response({
            "success": True,
            "message": message,
            "meta": {"count": len(data)},
            "results": data,
        })
    return Response({
        "success": True,
        "message": message,
        "meta": {"count": 1},
        "results": data,
    })