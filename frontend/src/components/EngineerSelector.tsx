import { useState, useEffect } from 'react'
import { Select, Spin } from 'antd'
import { userApi, User } from '../api/device'

interface EngineerSelectorProps {
  value?: string
  onChange?: (engineerId: string) => void
  organizationId?: string
  placeholder?: string
}

function EngineerSelector({
  value,
  onChange,
  organizationId,
  placeholder = '选择维保师傅',
}: EngineerSelectorProps) {
  const [engineers, setEngineers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchEngineers = async () => {
      setLoading(true)
      try {
        const params: { role?: string; organization_id?: string } = {
          role: 'ENGINEER',
        }
        if (organizationId) {
          params.organization_id = organizationId
        }
        const response = await userApi.list(params)
        if (response.code === 200) {
          setEngineers(response.data.list || [])
        }
      } catch (error) {
        console.error('Failed to fetch engineers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEngineers()
  }, [organizationId])

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      loading={loading}
      style={{ width: '100%' }}
      showSearch
      optionFilterProp="label"
      filterOption={(input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
      }
      options={engineers.map((engineer) => ({
        value: engineer.id,
        label: `${engineer.display_name || engineer.username}`,
      }))}
      notFoundContent={loading ? <Spin size="small" /> : null}
    />
  )
}

export default EngineerSelector
