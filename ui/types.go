package main

type Record struct {
    Location Location `json:"location"`
}

type Location struct {
    Segment *Segment`json:"linear,omitempty"`
    Single *Single `json:"point,omitempty"`
}

type Segment struct {
    From Point `json:"from"`
    To   Point `json:"to"`
}

type Single struct {
    Point Point`json:"point"`
}

type Point struct {
    Coordinates Coordinates `json:"coordinates"`
}

type Coordinates struct {
    Lat float64 `json:"lat"`
    Lon float64 `json:"lon"`
}

func (c Coordinates) Empty() bool {
    return c.Lat == 0.0 && c.Lon == 0.0
}

type MapLocation struct {
    Type  string        `json:"type"`
    Point *Coordinates  `json:"point,omitempty"`
    Path  []Coordinates `json:"path,omitempty"`
}

func (r Record) ToMapLocation(rs *RouteService) *MapLocation {
    if r.Location.Segment != nil {
        from := r.Location.Segment.From.Coordinates
        to := r.Location.Segment.To.Coordinates
        if from.Empty() || to.Empty() {
            return nil
        }
        path := rs.GetRoute(from, to)
        return &MapLocation{
            Type: "segment",
            Path: path,
        }
    }
    if r.Location.Single != nil {
        point := r.Location.Single.Point.Coordinates
        if point.Empty() {
            return nil
        }
        return &MapLocation{
            Type:  "point",
            Point: &point,
        }
    }
    return nil
}
