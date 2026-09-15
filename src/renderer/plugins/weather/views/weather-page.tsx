import { useState, useEffect, useCallback } from 'react'
import { GlassCard } from '@components/glass/glass-card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { ipc } from '@core/ipc/ipc-client'
import { useI18n } from '@core/i18n'
import type { TranslationKey } from '@core/i18n/types'
import { CloudSun, Droplets, Wind, Sun, Thermometer, MapPin, Search, Navigation } from 'lucide-react'

interface WeatherData {
  city: string
  lat: number
  lon: number
  temp: number
  /**
   * 天气描述的翻译键。
   *
   * 注意：这份数据会**缓存进数据库**（30 分钟）。所以这里存的是键而不是
   * 译好的文字 —— 否则切换语言后，旧缓存会让界面停留在上一种语言。
   */
  conditionKey?: TranslationKey
  /** 旧缓存里可能是已翻译好的文本，仅作回退显示 */
  condition?: string
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
  /** 星期几（0=周日）。与 day 一样属于渲染期计算，故缓存里存索引而非文字 */
  weekday?: number
  /** 是否为今天/明天，由索引推导，避免把「今天」这种相对词缓存下来 */
  dayOffset?: number
  /** 旧缓存字段，作回退 */
  day?: string
  icon: string
  high: number
  low: number
  rain: number
}

// WMO 天气代码映射：图标与语言无关，描述文案走 i18n
const WMO_CODES: Record<number, { key: TranslationKey; icon: string }> = {
  0: { key: 'weather.weatherCodes.clear', icon: '☀️' },
  1: { key: 'weather.weatherCodes.mainlyClear', icon: '🌤' },
  2: { key: 'weather.weatherCodes.partlyCloudy', icon: '⛅' },
  3: { key: 'weather.weatherCodes.overcast', icon: '☁️' },
  45: { key: 'weather.weatherCodes.fog', icon: '🌫' },
  48: { key: 'weather.weatherCodes.rimeFog', icon: '🌫' },
  51: { key: 'weather.weatherCodes.lightDrizzle', icon: '🌦' },
  53: { key: 'weather.weatherCodes.drizzle', icon: '🌦' },
  55: { key: 'weather.weatherCodes.denseDrizzle', icon: '🌧' },
  61: { key: 'weather.weatherCodes.lightRain', icon: '🌧' },
  63: { key: 'weather.weatherCodes.rain', icon: '🌧' },
  65: { key: 'weather.weatherCodes.heavyRain', icon: '🌧' },
  71: { key: 'weather.weatherCodes.lightSnow', icon: '🌨' },
  73: { key: 'weather.weatherCodes.snow', icon: '🌨' },
  75: { key: 'weather.weatherCodes.heavySnow', icon: '❄️' },
  77: { key: 'weather.weatherCodes.snowGrains', icon: '🌨' },
  80: { key: 'weather.weatherCodes.showers', icon: '⛈' },
  81: { key: 'weather.weatherCodes.heavyShowers', icon: '⛈' },
  82: { key: 'weather.weatherCodes.violentShowers', icon: '⛈' },
  85: { key: 'weather.weatherCodes.lightSnowShowers', icon: '🌨' },
  86: { key: 'weather.weatherCodes.heavySnowShowers', icon: '🌨' },
  95: { key: 'weather.weatherCodes.thunderstorm', icon: '⛈' },
  96: { key: 'weather.weatherCodes.thunderstormHail', icon: '⛈' },
  99: { key: 'weather.weatherCodes.heavyThunderstormHail', icon: '⛈' },
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

export default function WeatherPage() {
  const { t } = useI18n()
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

      if (!res.ok) throw new Error(t('weather.unavailable'))

      const json = await res.json()
      const current = json.current
      const daily = json.daily

      const wmo = WMO_CODES[current.weather_code] ?? { key: 'weather.weatherCodes.unknown' as TranslationKey, icon: '🌤' }

      const weatherData: WeatherData = {
        city,
        lat,
        lon,
        temp: Math.round(current.temperature_2m),
        conditionKey: wmo.key,
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
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)

          // 只存事实（星期几、相对今天的偏移），文字留到渲染时按语言生成
          const dayOffset =
            date.toDateString() === today.toDateString() ? 0
            : date.toDateString() === tomorrow.toDateString() ? 1
            : undefined

          const fWmo = WMO_CODES[daily.weather_code[i]]
          return {
            weekday: date.getDay(),
            dayOffset,
            icon: fWmo?.icon ?? '🌤',
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
      setError(err instanceof Error ? err.message : t('weather.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

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
      setError(t('weather.notFound'))
    }
  }

  const selectCity = (city: typeof POPULAR_CITIES[0]) => {
    setLocation(city.name)
    fetchWeather(city.name, city.lat, city.lon)
  }

  // 空气质量描述
  const getAQIDesc = (aqi: number) => {
    if (aqi <= 50) return t('weather.aqi.excellent')
    if (aqi <= 100) return t('weather.aqi.good')
    if (aqi <= 150) return t('weather.aqi.light')
    if (aqi <= 200) return t('weather.aqi.moderate')
    return t('weather.aqi.heavy')
  }

  /** 当前天气描述：优先用缓存里的翻译键，旧缓存则回退到已存文本 */
  const conditionText = data?.conditionKey
    ? t(data.conditionKey)
    : (data?.condition ?? '')

  /** 预报标签：今天/明天/星期几，全部在渲染时按当前语言生成 */
  const forecastDayLabel = (day: ForecastDay): string => {
    if (day.dayOffset === 0) return t('weather.today')
    if (day.dayOffset === 1) return t('weather.tomorrow')
    if (typeof day.weekday === 'number') {
      const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
      return t(`weather.weekdays.${keys[day.weekday]}` as TranslationKey)
    }
    return day.day ?? ''
  }

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">🌤</div>
          <p className="text-sm text-muted-foreground">{t('weather.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">🌤 {t('weather.title')}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('weather.searchPlaceholder')}
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
              {loading && <span className="text-xs text-muted-foreground animate-pulse">{t('weather.updating')}</span>}
            </div>
            <div className="text-7xl mb-2">{data.icon}</div>
            <div className="text-5xl font-bold text-foreground">{data.temp}°</div>
            <p className="text-lg text-muted-foreground">{conditionText}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('weather.feelsLike')} {data.feelsLike}° · {t('weather.pressure')} {data.pressure}hPa</p>

            <div className="mt-6 grid grid-cols-4 gap-4">
              {[
                { icon: Droplets, label: t('weather.humidity'), value: `${data.humidity}%` },
                { icon: Wind, label: t('weather.wind'), value: `${data.windSpeed} km/h` },
                { icon: Sun, label: t('weather.uv'), value: data.uv > 0 ? `${data.uv}` : '--' },
                { icon: Thermometer, label: t('weather.feelsLike'), value: `${data.feelsLike}°` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl bg-muted/30 p-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span>🫁 {t('weather.airQuality')} {data.aqi > 0 ? `AQI ${data.aqi} · ${getAQIDesc(data.aqi)}` : '--'}</span>
              <span>👁 {t('weather.visibility')} {data.visibility} {t('weather.km')}</span>
            </div>
          </GlassCard>

          {/* 7天预报 */}
          <GlassCard>
            <h3 className="font-semibold text-sm text-foreground mb-4">📅 {t('weather.forecast')}</h3>
            <div className="grid grid-cols-7 gap-2">
              {data.forecast.map((day, index) => (
                <div key={`${day.weekday ?? index}-${index}`} className="flex flex-col items-center gap-1 rounded-xl bg-muted/20 p-3">
                  <span className="text-xs font-medium text-muted-foreground">{forecastDayLabel(day)}</span>
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
