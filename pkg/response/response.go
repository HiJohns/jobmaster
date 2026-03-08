package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response represents the standard API response format
type Response struct {
	Code int         `json:"code"`
	Data interface{} `json:"data"`
	Msg  string      `json:"msg"`
}

// Success returns a successful response
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code: 200,
		Data: data,
		Msg:  "success",
	})
}

// Error returns an error response with custom status code
func Error(c *gin.Context, code int, msg string) {
	c.JSON(code, Response{
		Code: code,
		Data: nil,
		Msg:  msg,
	})
}

// BadRequest returns a 400 Bad Request response
func BadRequest(c *gin.Context, msg string) {
	Error(c, http.StatusBadRequest, msg)
}

// Unauthorized returns a 401 Unauthorized response
func Unauthorized(c *gin.Context, msg string) {
	Error(c, http.StatusUnauthorized, msg)
}

// Forbidden returns a 403 Forbidden response
func Forbidden(c *gin.Context, msg string) {
	Error(c, http.StatusForbidden, msg)
}

// NotFound returns a 404 Not Found response
func NotFound(c *gin.Context, msg string) {
	Error(c, http.StatusNotFound, msg)
}

// InternalServerError returns a 500 Internal Server Error response
func InternalServerError(c *gin.Context, msg string) {
	Error(c, http.StatusInternalServerError, msg)
}
