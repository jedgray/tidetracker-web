'use client'

import { useEffect, useRef } from 'react'
import type { DiveSite } from '@prisma/client'
import type { CorrectionResult } from '@/lib/corrections'

const MIN_OBS = 10

const CURR_NAMES: Record<string, string> = {
  PUG1515: 'The Narrows', PCT1516: 'Admiralty Inlet', PUG1501: 'Rich Passage',
  PUG1511: 'Colvos Passage', PUG1503: 'Agate Passage', ACT4176: 'Deception Pass',
  PCT1531: 'Port Townsend Canal', PUG1620: 'Marrowstone Point',
  PUG1641: 'Salt Creek', PUG1642: 'Strait of Juan de Fuca',
}
const TIDE_NAMES: Record<string, string> = {
  '9447130': 'Seattle', '9447110': 'Port Townsend', '9447214': 'Shilshole Bay',
  '9446807': 'Tacoma', '9447359': 'Everett', '9449880': 'Friday Harbor',
  '9448432': 'Anacortes', '9443090': 'Neah Bay',
}

interface Props {
  sites:       DiveSite[]
  corrections: Record<string, CorrectionResult>
  selectedId:  string | null
  onSelect:    (site: DiveSite) => void
}

export default function StationMap({ sites, corrections, selectedId, onSelect }: Props) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapInst    = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})
  const LRef       = useRef<any>(null)

  function pinSVG(selected: boolean) {
    const c  = selected ? '#f59e0b' : '#0a6bbd'
    const sw = selected ? 2.5 : 1.5
    return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.1 13 21 13 21S26 22.1 26 13C26 5.8 20.2 0 13 0z" fill="${c}" stroke="white" stroke-width="${sw}"/>
      <circle cx="13" cy="13" r="5.5" fill="white" opacity="0.9"/>
    </svg>`
  }

  function makeIcon(L: any, selected = false) {
    return L.divIcon({
      html:        pinSVG(selected),
      className:   '',
      iconSize:    [26, 34],
      iconAnchor:  [13, 34],
      popupAnchor: [0, -34],
    })
  }

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return

    import('leaflet').then(L => {
      if (!mapRef.current || mapInst.current) return
      LRef.current = L

      const map = L.map(mapRef.current!, { center: [47.95, -122.7], zoom: 8 })
      mapInst.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains:  'abcd',
        maxZoom:     19,
      }).addTo(map)

      sites.forEach(site => {
        const corr    = corrections[site.id]
        const hasCorr = corr?.active && corr.n >= MIN_OBS
        const skillColor = site.skill === 'beginner' ? '#059669' : site.skill === 'advanced' ? '#dc2626' : '#b45309'

        const tooltipHTML = `
          <div style="min-width:160px;font-family:system-ui,sans-serif;font-size:12px">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px">${site.name}</div>
            <div style="color:#666;margin-bottom:2px">${site.region} · ${site.type}</div>
            <div style="margin-bottom:2px">
              <span style="font-weight:700;color:${skillColor};text-transform:uppercase;font-size:9px">${site.skill}</span>
              &nbsp;·&nbsp;to ${site.depthFt} ft
            </div>
            <div style="color:#00897b;font-weight:600;font-size:11px">${CURR_NAMES[site.currStationId] ?? site.currStationId} · current</div>
            <div style="color:#0c447c;font-weight:600;font-size:11px">${TIDE_NAMES[site.tideStationId] ?? site.tideStationId} · tide</div>
            ${hasCorr ? `<div style="font-size:9px;font-weight:700;color:#065f46;background:#d1fae5;padding:1px 6px;border-radius:3px;display:inline-block;margin-top:4px">correction active · ${corr.n} obs</div>` : ''}
            ${site.currentWarn ? `<div style="font-size:9px;font-weight:700;color:#dc2626;margin-top:3px">⚠ Current sensitive</div>` : ''}
          </div>`

        const marker = L.marker([site.lat, site.lon], {
          icon: makeIcon(L, site.id === selectedId),
        }).bindTooltip(tooltipHTML, {
          direction: 'top',
          offset:    [0, -30],
          opacity:   1,
        })

        marker.on('click', () => onSelect(site))
        markersRef.current[site.id] = marker
        marker.addTo(map)
      })
    })

    return () => {
      if (mapInst.current) {
        mapInst.current.remove()
        mapInst.current = null
        markersRef.current = {}
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker icons when selection changes
  useEffect(() => {
    if (!LRef.current) return
    const L = LRef.current
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.setIcon(makeIcon(L, id === selectedId))
    })
    if (selectedId && mapInst.current) {
      const site = sites.find(s => s.id === selectedId)
      if (site) mapInst.current.panTo([site.lat, site.lon], { animate: true, duration: 0.4 })
    }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-100" style={{ height: '480px' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      <div className="absolute bottom-3 left-3 bg-white/90 rounded-lg px-3 py-2 border border-gray-100 flex gap-3 text-xs text-gray-600 z-[1000]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: '#0a6bbd' }} />
          Dive site
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          Selected
        </div>
        <div className="text-gray-400">Zoom in to separate nearby sites</div>
      </div>
    </div>
  )
}
