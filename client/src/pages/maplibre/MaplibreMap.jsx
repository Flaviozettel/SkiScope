import { useCallback, useEffect, useMemo, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import bbox from "@turf/bbox";
import Map, { Layer } from "react-map-gl/maplibre";
import { Source } from "react-map-gl/maplibre";

function MaplibreMap({ featureCollection, selectedFeatureID, setSelectedFeatureID }) {
  // create state ref that can be accessed in callbacks
  const mapRef = useRef();
  const prevSelectedFeatureID = useRef();
  // cache min and max values for style calculation
  const maxFlaeche = useMemo(
    () => Math.max(...featureCollection.features.map((f) => f.properties.kantonsflaeche)),
    [featureCollection.features]
  );
  const minFlaeche = useMemo(
    () => Math.min(...featureCollection.features.map((f) => f.properties.kantonsflaeche)),
    [featureCollection.features]
  );
  const kantoneBbox = useMemo(() => bbox(featureCollection), [featureCollection]);

  const handleSelectionChange = useCallback(
    (clickedFeature) => {
      // side effects: relies on component scoped refs
      // deselect previous feature
      if (prevSelectedFeatureID.current !== undefined) {
        mapRef.current.setFeatureState(
          { source: "kantone", id: prevSelectedFeatureID.current },
          { selected: false }
        );
      }
      if (clickedFeature) {
        // select feature
        setSelectedFeatureID(clickedFeature.id);
        prevSelectedFeatureID.current = clickedFeature.id;
        mapRef.current.setFeatureState(
          { source: "kantone", id: clickedFeature.id },
          { selected: true }
        );
        mapRef.current.fitBounds(bbox(clickedFeature), { essential: true, padding: 20 });
      } else {
        // no feature selected, zoom to data bounds
        prevSelectedFeatureID.current = undefined;
        setSelectedFeatureID(undefined);
        mapRef.current.fitBounds(kantoneBbox);
      }
    },
    [kantoneBbox, setSelectedFeatureID]
  );
  // handle feature selection if selectedFeatureID changes
  useEffect(() => {
    // check for initialisation
    if (mapRef.current && featureCollection) {
      // get selected feature
      const selectedFeature = featureCollection.features.filter(
        (f) => f.id === selectedFeatureID
      )[0];
      handleSelectionChange(selectedFeature);
    }
  }, [handleSelectionChange, selectedFeatureID, featureCollection]);

  return (
    <Map
      id="maplibre-container"
      ref={mapRef}
      initialViewState={{
        center: [0, 0], // starting position [lng, lat]. we'll zoom to data later
        zoom: 1, // starting zoom
        maxBounds: [
          [4, 44],
          [13, 49],
        ],
      }}
      interactiveLayerIds={["kantone"]}
      // Change the cursor to a pointer when the mouse is over the states layer.
      onMouseEnter={() => (mapRef.current.getCanvas().style.cursor = "pointer")}
      // Change it back to a pointer when it leaves.
      onMouseLeave={() => (mapRef.current.getCanvas().style.cursor = "")}
      // add interaction, specify "click" instead of default "singleclick" because
      // the latter introduces 250ms delay to check for doubleclick
      onClick={(e) => setSelectedFeatureID(e.features[0]?.id)}
      // zoom to data
      onLoad={(e) => e.target.fitBounds(kantoneBbox)}
    >
      <Source id="kantone" type="geojson" data={featureCollection}>
        <Layer
          id="kantone"
          type="fill"
          source="kantone"
          paint={{
            "fill-color": [
              "interpolate-lab",
              ["linear"],
              ["get", "kantonsflaeche"],
              minFlaeche,
              "rgb(239,243,255)",
              maxFlaeche - minFlaeche,
              "#2171b5",
              maxFlaeche,
              "#08306B",
            ],
          }}
        />
        <Layer
          id="kantone-highlight"
          type="line"
          source="kantone"
          paint={{
            "line-color": "#2171b5",
            "line-width": 3,
            "line-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 1, 0],
          }}
        />
      </Source>
    </Map>
  );
}

export default MaplibreMap;
