# Billeder

Læg fotos af personer og dokumenter her med beskrivende, ASCII-filnavne. Eksempler:

- `sharling-vera-barn.jpg` — Vera Sharling som barn (A3, billede 8)
- `sharling-alma-vera-hanspeter.jpg` — Alma, Vera og Hans-Peter (A3, billede 9–10)
- `attest-marinus-vielse-1923.jpg` — vielsesattest, Marinus & Alma 1923 (B5)
- `attest-alma-camilla-daab-1904.jpg` — Alma Camillas dåbsattest (B6)
- `brev-rolf-jensen-1999.jpg` — Rolf Jensens brev (A2)
- `brev-faster-vera-2000.jpg` — Faster Veras brev til Birgit (C3)
- `stamtavle-jensen.jpg` — den maskinskrevne stamtavle (A1)

Konvention: små ASCII-bogstaver, bindestreger, ingen mellemrum, ingen `æ/ø/å`. Tilføj år hvor det giver mening for at undgå navnesammenstød.

Referer billeder fra en persons fil i `personer/` under `billeder:`-listen, så de bliver vedhæftet personen i den genererede GEDCOM:

```yaml
billeder:
  - billeder/sharling-vera-barn.jpg
```
