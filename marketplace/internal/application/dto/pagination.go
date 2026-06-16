package dto

type PaginatedResponse struct {
	Data       any   `json:"data"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"totalPages"`
}

func NewPaginatedResponse(data any, page, limit int, total int64) *PaginatedResponse {
	totalPages := total / int64(limit)
	if total%int64(limit) > 0 {
		totalPages++
	}
	return &PaginatedResponse{
		Data:       data,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}
}
