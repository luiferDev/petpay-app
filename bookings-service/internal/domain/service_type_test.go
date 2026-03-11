package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestServiceType_Scan(t *testing.T) {
	tests := []struct {
		name    string
		input   interface{}
		want    ServiceType
		wantErr bool
	}{
		{
			name:    "scan string value",
			input:   "GROOMING",
			want:    ServiceTypeGrooming,
			wantErr: false,
		},
		{
			name:    "scan []byte value",
			input:   []byte("VETERINARY"),
			want:    ServiceTypeVeterinary,
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
			name:    "scan empty string",
			input:   "",
			want:    "",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var st ServiceType
			err := st.Scan(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.want, st)
		})
	}
}

func TestServiceType_Value(t *testing.T) {
	tests := []struct {
		name  string
		input ServiceType
		want  string
	}{
		{
			name:  "grooming value",
			input: ServiceTypeGrooming,
			want:  "GROOMING",
		},
		{
			name:  "veterinary value",
			input: ServiceTypeVeterinary,
			want:  "VETERINARY",
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
