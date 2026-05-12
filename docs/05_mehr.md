---
layout: default
title: Mehr
---

### Maximale Schneehöhe

Im Header der Anwendung wird permanent das Skigebiet mit der **aktuell höchsten gemessenen Pisten-Schneehöhe** angezeigt — inklusive Schneehöhe in Zentimetern und Skigebietsname. Damit hat der Nutzer immer einen schnellen Überblick darüber, wo gerade die besten Schneeverhältnisse herrschen.

Ein Klick auf die Anzeige zoomt die Karte direkt auf das entsprechende Skigebiet. Im Hintergrund wird dafür eine GeoServer-WFS-Anfrage ausgeführt, um die aktuellen Koordinaten des Spitzenreiters zu ermitteln. Die Auswertung selbst übernimmt das Backend über den Endpunkt `GET /skigebiete/top-schnee`, der die Schneetiefe aller Skigebiete vergleicht und nur das aktuell schneereichste Gebiet zurückliefert.

### 🐿️ Easter Nut — Scrat

Wer die Karte in den 3D-Modus kippt (Pitch > 10°), wird von einem besonderen Gast begrüsst: **Scrat** aus *Ice Age* taucht auf der Karte auf. Einfach die rechte Maustaste gedrückt halten und die Karte neigen.
