---
layout: default
title: Mehr
---

### Maximale Schneehöhe

Im Header der Anwendung wird permanent das Skigebiet mit der **aktuell höchsten gemessenen Pisten-Schneehöhe** angezeigt — inklusive Schneehöhe in Zentimetern und Skigebietsname. Damit hat der Nutzer immer einen schnellen Überblick darüber, wo gerade die besten Schneeverhältnisse herrschen.

Ein Klick auf die Anzeige zoomt die Karte direkt auf das entsprechende Skigebiet. Im Hintergrund wird dafür eine GeoServer-WFS-Anfrage ausgeführt, um die aktuellen Koordinaten des Spitzenreiters zu ermitteln. Die Auswertung selbst übernimmt das Backend über den Endpunkt `GET /skigebiete/top-schnee`, der die Schneetiefe aller Skigebiete vergleicht und nur das aktuell schneereichste Gebiet zurückliefert.

<img src="assets/gifs/MaxSchneehoehe.gif" alt="Shortcut zu Skigebiet mit der maximalen Schneehöhe" class="gifs">
