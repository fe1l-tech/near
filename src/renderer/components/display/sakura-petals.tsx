import { useEffect, useRef } from 'react'

interface Petal {
  x: number
  y: number
  size: number
  speed: number
  rotation: number
  rotationSpeed: number
  opacity: number
  drift: number
  driftSpeed: number
}

/**
 * 飘落樱花瓣背景装饰
 */
export function SakuraPetals() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const petals: Petal[] = []

    // 初始化花瓣
    const initPetals = () => {
      petals.length = 0
      const count = Math.floor((canvas.width * canvas.height) / 28000)
      for (let i = 0; i < count; i++) {
        petals.push(createPetal(canvas))
      }
    }

    const createPetal = (c: HTMLCanvasElement): Petal => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      size: 8 + Math.random() * 16,
      speed: 0.3 + Math.random() * 0.8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 1.5,
      opacity: 0.15 + Math.random() * 0.25,
      drift: 0,
      driftSpeed: (Math.random() - 0.5) * 0.6,
    })

    // 绘制单个花瓣
    const drawPetal = (ctx: CanvasRenderingContext2D, petal: Petal) => {
      ctx.save()
      ctx.translate(petal.x, petal.y)
      ctx.rotate((petal.rotation * Math.PI) / 180)

      const w = petal.size
      const h = petal.size * 0.6

      // 樱花花瓣形状
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(-w * 0.4, -h * 0.5, -w * 0.3, -h, 0, -h)
      ctx.bezierCurveTo(w * 0.3, -h, w * 0.4, -h * 0.5, 0, 0)
      ctx.closePath()

      // 花瓣颜色 — 柔和的粉
      const gradient = ctx.createLinearGradient(0, 0, 0, -h)
      gradient.addColorStop(0, `rgba(245, 160, 180, ${petal.opacity + 0.1})`)
      gradient.addColorStop(0.5, `rgba(250, 200, 215, ${petal.opacity})`)
      gradient.addColorStop(1, `rgba(248, 180, 195, ${petal.opacity - 0.05})`)
      ctx.fillStyle = gradient
      ctx.fill()

      // 花瓣纹理线
      ctx.strokeStyle = `rgba(240, 140, 160, ${petal.opacity * 0.3})`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -h * 0.7)
      ctx.stroke()

      ctx.restore()
    }

    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const petal of petals) {
        // 下落
        petal.y += petal.speed
        // 左右飘移
        petal.drift += petal.driftSpeed
        petal.x += Math.sin(petal.drift * 0.02) * 0.4
        // 旋转
        petal.rotation += petal.rotationSpeed

        // 超出画布后重置到顶部
        if (petal.y > canvas.height + 20) {
          petal.y = -20
          petal.x = Math.random() * canvas.width
        }
        if (petal.x > canvas.width + 20) petal.x = -20
        if (petal.x < -20) petal.x = canvas.width + 20

        drawPetal(ctx, petal)
      }

      animationId = requestAnimationFrame(animate)
    }

    // 响应大小变化
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initPetals()
    }

    resize()
    window.addEventListener('resize', resize)
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
