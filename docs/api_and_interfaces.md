---
layout: default
title: APIs and Interfaces
---

# Schnittstellen

Für die Anwendung _SkiScope_ werden verschiedene externe Datenquellen genutzt, um aktuelle und relevante Informationen zu Skigebieten bereitzustellen. Diese Daten werden automatisiert abgerufen, verarbeitet und im Frontend visualisiert.

Folgende Daten werden für die Anwendung bezogen:

---

### Geodaten

Die Geodaten der Pisten und Liftanlagen wurden einmalig über die Overpass API (OpenStreetMap) bezogen und bilden die Grundlage für die kartografische Darstellung in der Anwendung.
Aus den dazugehörigen Attributen wurden Informationen, wie Pistenlevel (...) oder der Liftart (Bügel, ...) gewonnen.

---

### Betriebsstatus Pisten und Skilifte

Der Betriebsstatus der Pisten und Liftanlangen, sowie die Angaben zu Pistenlängen und Schneehöhen werden über die STNet API von Schweiz Tourismus bezogen.

---

### Meteodaten

Die Wetterdaten (14-Tages Ansicht) werden über Open-Meteo anhand der Koordinaten der entsprechenden Skigebiete bezogen. Als Initialwert wird hier das Wetter von Muttenz geladen.
Sobald eine neue Station, bzw. ein Skigebiet gewählt wird, werden die Meteodaten über den Backend-Endpunkt `/skigebiet/wetterprognose` geladen.

Hierbei wird im Backend geprüft, ob aktuelle Daten (jünger als 3h) in der Datenbank vorhanden sind. Ist das nicht der Fall, so wird mittels einer Centerpoint Koordinate, welche aus der DB abgefragt wird, über die Open-Meteo-API ein neuer Datensatz bezogen. Dieser wird direkt an das Frontend gesendet und anschliessend als Task später in die DB gespeichert, so dass bei einer kurz darauf folgenden Anfrage, nicht erneut ein Datensatz über die API angefragt werden muss.

---

### Schneehöhen

Die Schneehöhen werden als GeoJSON-Features über eine API des SLF (Institut für Schnee- und Lawinenforschung) bezogen und mittels PostGIS als Polygon Geometrien in die Datenbank gespeichert.

Hierbei wird automatisch dafür gesorgt, dass die Schneehöhen der letzten sieben Tage in der Datenbank vorhanden sind. Fehlende Daten werden ebenfalls nachgeladen.
