import { useState, useEffect, useCallback } from 'react'
import { GlassCard } from '@components/glass/glass-card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { ipc } from '@core/ipc/ipc-client'
import { CloudSun, Droplets, Wind, Sun, Thermometer, MapPin, Search, Navigation } from 'lucide-react'

interface WeatherData {
  city: string
  lat: number
  lon: number
  temp: number
  condition: string
  icon: string
  humidity: number
  windSpeed: number
  uv: number
  visibility: number
  feelsLike: number
  pressure: number
  forecast: ForecastDay[]
  aqi: number
}

interface ForecastDay {
  day: string
  icon: string
  high: number
  low: number
  rain: number
}

// WMO 天气代码映射
const WMO_CODES: Record<number, { condition: string; icon: string }> = {
  0: { condition: '晴', icon: '☀️' },
  1: { condition: '大部晴朗', icon: '🌤' },
  2: { condition: '多云', icon: '⛅' },
  3: { condition: '阴', icon: '☁️' },
  45: { condition: '雾', icon: '🌫' },
  48: { condition: '霜雾', icon: '🌫' },
  51: { condition: '小毛毛雨', icon: '🌦' },
  53: { condition: '毛毛雨', icon: '🌦' },
  55: { condition: '大毛毛雨', icon: '🌧' },
  61: { condition: '小雨', icon: '🌧' },
  63: { condition: '中雨', icon: '🌧' },
  65: { condition: '大雨', icon: '🌧' },
  71: { condition: '小雪', icon: '🌨' },
  73: { condition: '中雪', icon: '🌨' },
  75: { condition: '大雪', icon: '❄️' },
  77: { condition: '雪粒', icon: '🌨' },
  80: { condition: '阵雨', icon: '⛈' },
  81: { condition: '大阵雨', icon: '⛈' },
  82: { condition: '强阵雨', icon: '⛈' },
  85: { condition: '小阵雪', icon: '🌨' },
  86: { condition: '大阵雪', icon: '🌨' },
  95: { condition: '雷暴', icon: '⛈' },
  96: { condition: '冰雹雷暴', icon: '⛈' },
  99: { condition: '强冰雹雷暴', icon: '⛈' },
}

// 默认城市列表
const POPULAR_CITIES = [
  { name: '北京', lat: 39.9042, lon: 116.4074 },
  { name: '上海', lat: 31.2304, lon: 121.4737 },
  { name: '广州', lat: 23.1291, lon: 113.2644 },
  { name: '深圳', lat: 22.5431, lon: 114.0579 },
  { name: '杭州', lat: 30.2741, lon: 120.1551 },
  { name: '成都', lat: 30.5728, lon: 104.0668 },
  { name: '武汉', lat: 30.5928, lon: 114.3055 },
  { name: '南京', lat: 32.0603, lon: 118.7969 },
  { name: '重庆', lat: 29.5630, lon: 106.5510 },
]

const DEFAULT_CITY = POPULAR_CITIES[0]
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function WeatherPage() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState(DEFAULT_CITY.name)
  const [searchInput, setSearchInput] = useState('')

  const fetchWeather = useCallback(async (city: string, lat: number, lon: number) => {
    setLoading(true)
    setError('')

    // 先尝试从缓存获取
    try {
      const cached = await ipc.weather.getCached(city)
      if (cached) {
        const cachedData = (cached as any)?.data || cached
        if (cachedData && cachedData.temp !== undefined) {
          setData(cachedData as WeatherData)
          setLoading(false)
          return
        }
      }
    } catch { /* 缓存不可用，继续请求 API */ }

    try {
      // Open-Meteo API（免费，无需 Key）
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=7`
      const res = await fetch(url)

      if (!res.ok) throw new Error('天气服务暂不可用')

      const json = await res.json()
      const current = json.current
      const daily = json.daily

      const wmo = WMO_CODES[current.weather_code] || { condition: '未知', icon: '🌤' }

      const weatherData: WeatherData = {
        city,
        lat,
        lon,
        temp: Math.round(current.temperature_2m),
        condition: wmo.condition,
        icon: wmo.icon,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        uv: 0,
        visibility: 10,
        feelsLike: Math.round(current.apparent_temperature),
        pressure: Math.round(current.pressure_msl),
        aqi: 0,
        forecast: daily.time.map((dateStr: string, i: number) => {
          const date = new Date(dateStr)
          const today = new Date()
          const isToday = date.toDateString() === today.toDateString()
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          const isTomorrow = date.toDateString() === tomorrow.toDateString()

          let dayLabel: string
          if (isToday) dayLabel = '今天'
          else if (isTomorrow) dayLabel = '明天'
          else dayLabel = WEEKDAY_NAMES[date.getDay()]

          const fWmo = WMO_CODES[daily.weather_code[i]] || { icon: '🌤' }
          return {
            day: dayLabel,
            icon: fWmo.icon,
            high: Math.round(daily.temperature_2m_max[i]),
            low: Math.round(daily.temperature_2m_min[i]),
            rain: daily.precipitation_probability_max[i] || 0,
          }
        }),
      }

      setData(weatherData)

      // 缓存到数据库（30分钟有效期在 IPC 端控制）
      try {
        await ipc.weather.setCache(city, weatherData, lat, lon)
      } catch { /* 缓存失败不影响主流程 */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取天气失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 初次进入加载默认城市天气
  useEffect(() => {
    fetchWeather(DEFAULT_CITY.name, DEFAULT_CITY.lat, DEFAULT_CITY.lon)
  }, [fetchWeather])

  const handleSearch = () => {
    const city = POPULAR_CITIES.find(
      c => c.name.includes(searchInput) || searchInput.includes(c.name),
    )
    if (city) {
      setLocation(city.name)
      fetchWeather(city.name, city.lat, city.lon)
      setSearchInput('')
    } else if (searchInput.trim()) {
      setError('未找到该城市，请尝试热门城市')
    }
  }

  const selectCity = (city: typeof POPULAR_CITIES[0]) => {
    setLocation(city.name)
    fetchWeather(city.name, city.lat, city.lon)
  }

  // 空气质量描述
  const getAQIDesc = (aqi: number) => {
    if (aqi <= 50) return '优'
    if (aqi <= 100) return '良'
    if (aqi <= 150) return '轻度污染'
    if (aqi <= 200) return '中度污染'
    return '重度污染'
  }

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">🌤</div>
          <p className="text-sm text-muted-foreground">获取天气数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">🌤 天气</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索城市..."
              className="pl-9 w-40 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 热门城市 */}
      <div className="flex flex-wrap gap-2">
        {POPULAR_CITIES.map((city) => (
          <button
            key={city.name}
            onClick={() => selectCity(city)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              location === city.name
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border/50 text-muted-foreground hover:border-primary/20'
            }`}
          >
            {city.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* 当前天气 */}
          <GlassCard glow className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{data.city}</span>
              {loading && <span className="text-xs text-muted-foreground animate-pulse">更新中...</span>}
            </div>
            <div className="text-7xl mb-2">{data.icon}</div>
            <div className="text-5xl font-bold text-foreground">{data.temp}°</div>
            <p className="text-lg text-muted-foreground">{data.condition}</p>
            <p className="text-sm text-muted-foreground mt-1">体感 {data.feelsLike}° · 气压 {data.pressure}hPa</p>

            <div className="mt-6 grid grid-cols-4 gap-4">
              {[
                { icon: Droplets, label: '湿度', value: `${data.humidity}%` },
                { icon: Wind, label: '风力', value: `${data.windSpeed} km/h` },
                { icon: Sun, label: '紫外线', value: data.uv > 0 ? `${data.uv} 级` : '--' },
                { icon: Thermometer, label: '体感', value: `${data.feelsLike}°` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-muted/30 p-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span>🫁 空气质量 {data.aqi > 0 ? `AQI ${data.aqi} · ${getAQIDesc(data.aqi)}` : '--'}</span>
              <span>👁 能见度 {data.visibility} km</span>
            </div>
          </GlassCard>

          {/* 7天预报 */}
          <GlassCard>
            <h3 className="font-semibold text-sm text-foreground mb-4">📅 7 天预报</h3>
            <div className="grid grid-cols-7 gap-2">
              {data.forecast.map((day) => (
                <div key={day.day} className="flex flex-col items-center gap-1 rounded-xl bg-muted/20 p-3">
                  <span className="text-xs font-medium text-muted-foreground">{day.day}</span>
                  <span className="text-2xl">{day.icon}</span>
                  <div className="text-xs font-medium mt-1">
                    <span className="text-foreground">{day.high}°</span>
                    <span className="text-muted-foreground ml-1">{day.low}°</span>
                  </div>
                  {day.rain > 0 && (
                    <span className="text-[10px] text-sky-400">💧 {day.rain}%</span>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}
