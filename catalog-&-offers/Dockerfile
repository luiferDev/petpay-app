FROM golang:1.25.3-alpine

WORKDIR /appS

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o catalog .

EXPOSE 8083

CMD ["./catalog"]