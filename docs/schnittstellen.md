---
layout: default
title: MapYourTrip
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
Sobald eine neue Station, bzw. ein Skigebiet gewählt wird, werden die Meteodaten über ein den Backend-Endpunkt `/skigebiet/wetterprognose` geladen.

---

### Schneehöhen

Die Schneehöhen werden im Vektorformat über eine API des SLF (Institut für Schnee- und Lawinenforschung) bezogen.
