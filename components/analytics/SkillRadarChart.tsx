'use client'

import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Radar } from 'react-chartjs-2'
import { RadarChartData } from '@/lib/industry-analytics'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface SkillRadarChartProps {
  data: RadarChartData
  title?: string
}

export default function SkillRadarChart({ data, title }: SkillRadarChartProps) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12,
            family: 'system-ui, -apple-system, sans-serif'
          },
          color: '#374151'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#6B7280',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          label: function(context: unknown) {
            return `${context.dataset.label}: ${context.parsed.r}点`
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 100,
        stepSize: 20,
        grid: {
          color: '#E5E7EB',
          lineWidth: 1
        },
        angleLines: {
          color: '#E5E7EB',
          lineWidth: 1
        },
        pointLabels: {
          font: {
            size: 11,
            family: 'system-ui, -apple-system, sans-serif'
          },
          color: '#374151',
          padding: 10
        },
        ticks: {
          stepSize: 20,
          font: {
            size: 10
          },
          color: '#6B7280',
          backdropColor: 'transparent'
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2,
        tension: 0.1
      },
      point: {
        radius: 4,
        hoverRadius: 6
      }
    }
  }

  return (
    <div className="w-full h-80">
      {title && (
        <h3 className="text-lg font-medium text-center mb-4 text-gray-900">
          {title}
        </h3>
      )}
      <Radar data={data} options={options} />
    </div>
  )
}