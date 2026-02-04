package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"
)

// ActiveCounter provides the count of active incidents from cache.
type ActiveCounter interface {
	GetActiveCount(ctx context.Context) (int64, error)
}

type Handler struct {
	repo  *Repository
	cache ActiveCounter
}

func NewHandler(repo *Repository, cache ActiveCounter) *Handler {
	return &Handler{repo: repo, cache: cache}
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
	mux.HandleFunc("GET /api/dashboard/impact/summary", h.handleImpactSummary)
	mux.HandleFunc("GET /api/dashboard/duration/distribution", h.handleDurationDistribution)
	mux.HandleFunc("GET /api/dashboard/distribution/route", h.handleRouteAnalysis)
	mux.HandleFunc("GET /api/dashboard/distribution/direction", h.handleDirectionAnalysis)
	mux.HandleFunc("GET /api/dashboard/patterns/rush-hour", h.handleRushHourComparison)
	mux.HandleFunc("GET /api/dashboard/hotspots", h.handleHotspots)
	mux.HandleFunc("GET /api/dashboard/anomalies", h.handleAnomalies)
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

	// Override active count from Valkey (source of truth for live data)
	if h.cache != nil {
		count, err := h.cache.GetActiveCount(r.Context())
		if err != nil {
			slog.Warn(fmt.Sprintf("failed to get active count from cache, using clickhouse: %s", err))
		} else {
			summary.ActiveIncidents = int32(count)
		}
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
	SSEConnectionsTotal.Inc()
	SSEConnectionsActive.Inc()
	defer SSEConnectionsActive.Dec()

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

	// Override active count from Valkey (source of truth for live data)
	if h.cache != nil {
		count, err := h.cache.GetActiveCount(ctx)
		if err != nil {
			slog.Warn(fmt.Sprintf("failed to get active count from cache: %s", err))
		} else {
			summary.ActiveIncidents = int32(count)
		}
	}

	data, err := json.Marshal(summary)
	if err != nil {
		return err
	}

	fmt.Fprintf(w, "event: summary\ndata: %s\n\n", data) //nolint:errcheck
	SSEEventsTotal.WithLabelValues("summary").Inc()
	return rc.Flush()
}

func (h *Handler) handleImpactSummary(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetImpactSummary(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get impact summary: %s", err))
		h.writeError(w, "failed to get impact summary", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, ImpactSummaryResponse{Data: data})
}

func (h *Handler) handleDurationDistribution(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetDurationDistribution(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get duration distribution: %s", err))
		h.writeError(w, "failed to get duration distribution", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, DurationDistributionResponse{Data: data})
}

func (h *Handler) handleRouteAnalysis(w http.ResponseWriter, r *http.Request) {
	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	data, err := h.repo.GetRouteAnalysis(r.Context(), limit)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get route analysis: %s", err))
		h.writeError(w, "failed to get route analysis", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, RouteAnalysisResponse{Data: data})
}

func (h *Handler) handleDirectionAnalysis(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetDirectionAnalysis(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get direction analysis: %s", err))
		h.writeError(w, "failed to get direction analysis", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, DirectionAnalysisResponse{Data: data})
}

func (h *Handler) handleRushHourComparison(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetRushHourComparison(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get rush hour comparison: %s", err))
		h.writeError(w, "failed to get rush hour comparison", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, RushHourResponse{Data: data})
}

func (h *Handler) handleHotspots(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	data, err := h.repo.GetHotspots(r.Context(), limit)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get hotspots: %s", err))
		h.writeError(w, "failed to get hotspots", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, HotspotsResponse{Data: data})
}

func (h *Handler) handleAnomalies(w http.ResponseWriter, r *http.Request) {
	data, err := h.repo.GetAnomalies(r.Context())
	if err != nil {
		slog.Error(fmt.Sprintf("failed to get anomalies: %s", err))
		h.writeError(w, "failed to get anomalies", http.StatusInternalServerError)
		return
	}
	h.writeJSON(w, AnomaliesResponse{Data: data})
}
