package ui

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/dashboard/summary", h.handleSummary)
	mux.HandleFunc("GET /api/dashboard/trends/hourly", h.handleHourlyTrend)
	mux.HandleFunc("GET /api/dashboard/trends/daily", h.handleDailyTrend)
	mux.HandleFunc("GET /api/dashboard/distribution/severity", h.handleSeverityDistribution)
	mux.HandleFunc("GET /api/dashboard/distribution/cause-type", h.handleCauseTypeDistribution)
	mux.HandleFunc("GET /api/dashboard/distribution/province", h.handleProvinceDistribution)
	mux.HandleFunc("GET /api/dashboard/top/roads", h.handleTopRoads)
	mux.HandleFunc("GET /api/dashboard/top/subtypes", h.handleTopSubtypes)
	mux.HandleFunc("GET /api/dashboard/heatmap", h.handleHeatmap)
	mux.HandleFunc("GET /api/dashboard/incidents/active", h.handleActiveIncidents)
	mux.HandleFunc("GET /sse/dashboard", h.handleSSE)
}

func (h *Handler) writeJSON(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error(fmt.Sprintf("failed to encode json response: %s", err))
	}
}

func (h *Handler) writeError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
    json.NewEncoder(w).Encode(map[string]string{"error": msg}) //nolint:errcheck
}

func (h *Handler) handleSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.repo.GetSummary(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get summary: %s", err))
		h.writeError(w, "failed to get summary", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, summary)
}

func (h *Handler) handleHourlyTrend(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetHourlyTrend(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get hourly trend: %s", err))
		h.writeError(w, "failed to get hourly trend", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, HourlyTrendResponse{Data: data})
}

func (h *Handler) handleDailyTrend(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetDailyTrend(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get daily trend: %s", err))
		h.writeError(w, "failed to get daily trend", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, DailyTrendResponse{Data: data})
}

func (h *Handler) handleSeverityDistribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetSeverityDistribution(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get severity distribution: %s", err))
		h.writeError(w, "failed to get severity distribution", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, DistributionResponse{Data: data})
}

func (h *Handler) handleCauseTypeDistribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetCauseTypeDistribution(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get cause type distribution: %s", err))
		h.writeError(w, "failed to get cause type distribution", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, DistributionResponse{Data: data})
}

func (h *Handler) handleProvinceDistribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetProvinceDistribution(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get province distribution: %s", err))
		h.writeError(w, "failed to get province distribution", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, DistributionResponse{Data: data})
}

func (h *Handler) handleTopRoads(w http.ResponseWriter, r *http.Request) {
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	data, err := h.repo.GetTopRoads(r.Context(), limit)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get top roads: %s", err))
		h.writeError(w, "failed to get top roads", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, TopRoadsResponse{Data: data})
}

func (h *Handler) handleTopSubtypes(w http.ResponseWriter, r *http.Request) {
	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	data, err := h.repo.GetTopSubtypes(r.Context(), limit)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get top subtypes: %s", err))
		h.writeError(w, "failed to get top subtypes", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, TopSubtypesResponse{Data: data})
}

func (h *Handler) handleHeatmap(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetHeatmapData(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get heatmap data: %s", err))
		h.writeError(w, "failed to get heatmap data", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, HeatmapResponse{Data: data})
}

func (h *Handler) handleActiveIncidents(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetActiveIncidents(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get active incidents: %s", err))
		h.writeError(w, "failed to get active incidents", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, ActiveIncidentsResponse{Data: data})
}

func (h *Handler) handleSSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	rc := http.NewResponseController(w)

	// Send initial summary
	if err := h.sendSummaryEvent(r.Context(), w, rc); err != nil {
		slog.Error(fmt.Sprintf("failed to send initial summary: %s", err))
		return
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			if err := h.sendSummaryEvent(r.Context(), w, rc); err != nil {
				slog.Error(fmt.Sprintf("failed to send summary event: %s", err))
				return
			}
		}
	}
}

func (h *Handler) sendSummaryEvent(ctx context.Context, w http.ResponseWriter, rc *http.ResponseController) error {
	summary, err := h.repo.GetSummary(ctx)
	if err != nil {
		return err
	}

	data, err := json.Marshal(summary)
	if err != nil {
		return err
	}

    fmt.Fprintf(w, "event: summary\ndata: %s\n\n", data) //nolint:errcheck
	return rc.Flush()
}
