// ============================================================
// config.js – Zentrale Konfiguration für API- und GeoServer-URLs
// ============================================================

export const API_BASE = "http://192.168.4.228:8000";

export const GEOSERVER =
  "http://192.168.4.228:8080/geoserver/skiscope/ows?service=WMS&version=1.1.1&request=GetMap";

export const GEOSERVER_WFS =
  "http://192.168.4.228:8080/geoserver/skiscope/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=skiscope:Skigebiete_Zentroide&outputFormat=application/json";
