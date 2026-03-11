package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBookingStatus_Scan(t *testing.T) {
	tests := []struct {
		name    string
		input   interface{}
		want    BookingStatus
		wantErr bool
	}{
		{
			name:    "scan string value",
			input:   "PENDING",
			want:    BookingStatusPending,
			wantErr: false,
		},
		{
			name:    "scan []byte value",
			input:   []byte("CONFIRMED"),
			want:    BookingStatusConfirmed,
			wantErr: false,
		},
		{
			name:    "scan nil value",
			input:   nil,
			want:    "",
			wantErr: false,
		},
		{
			name:    "scan invalid type",
			input:   123,
			want:    "",
			wantErr: true,
		},
		{
			name:    "scan completed status",
			input:   "COMPLETED",
			want:    BookingStatusCompleted,
			wantErr: false,
		},
		{
			name:    "scan cancelled status",
			input:   "CANCELLED",
			want:    BookingStatusCancelled,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var bs BookingStatus
			err := bs.Scan(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.want, bs)
		})
	}
}

func TestBookingStatus_Value(t *testing.T) {
	tests := []struct {
		name  string
		input BookingStatus
		want  string
	}{
		{
			name:  "pending value",
			input: BookingStatusPending,
			want:  "PENDING",
		},
		{
			name:  "confirmed value",
			input: BookingStatusConfirmed,
			want:  "CONFIRMED",
		},
		{
			name:  "in progress value",
			input: BookingStatusInProgress,
			want:  "IN_PROGRESS",
		},
		{
			name:  "completed value",
			input: BookingStatusCompleted,
			want:  "COMPLETED",
		},
		{
			name:  "empty value",
			input: "",
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			val, err := tt.input.Value()
			assert.NoError(t, err)
			assert.Equal(t, tt.want, val)
		})
	}
}
