package core

type PaginatedResult struct {
	Data       any   `json:"data"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"totalPages"`
}

func NewPaginatedResult(data any, page, limit int, total int64) *PaginatedResult {
	totalPages := total / int64(limit)
	if total%int64(limit) > 0 {
		totalPages++
	}
	return &PaginatedResult{
		Data:       data,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}
}
