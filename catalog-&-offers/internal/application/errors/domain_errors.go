package errors

import (
	"fmt"
	"net/http"
)

type DomainError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	StatusCode int    `json:"-"`
	Details    any    `json:"details,omitempty"`
}

func (e *DomainError) Error() string {
	return e.Message
}

func NotFound(resource, id string) *DomainError {
	return &DomainError{
		Code:       "NOT_FOUND",
		Message:    fmt.Sprintf("%s not found: %s", resource, id),
		StatusCode: http.StatusNotFound,
	}
}

func ValidationFailed(msg string) *DomainError {
	return &DomainError{
		Code:       "VALIDATION_ERROR",
		Message:    msg,
		StatusCode: http.StatusBadRequest,
	}
}

func Conflict(msg string) *DomainError {
	return &DomainError{
		Code:       "CONFLICT",
		Message:    msg,
		StatusCode: http.StatusConflict,
	}
}

func Internal(msg string) *DomainError {
	return &DomainError{
		Code:       "INTERNAL_ERROR",
		Message:    msg,
		StatusCode: http.StatusInternalServerError,
	}
}

func Unauthorized(msg string) *DomainError {
	return &DomainError{
		Code:       "UNAUTHORIZED",
		Message:    msg,
		StatusCode: http.StatusUnauthorized,
	}
}
