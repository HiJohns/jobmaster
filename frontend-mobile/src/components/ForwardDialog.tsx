import { useState, useEffect } from 'react'
import { Dialog, Selector } from 'antd-mobile'
import { localWorkorderApi } from '../api/local/workorder'

interface ForwardDialogProps {
  visible: boolean
  onClose: () => void
  workOrderId: string
  onSuccess: () => void
}

interface Organization {
  id: string
  name: string
  type: 'CONTRACTOR' | 'VENDOR'
}

/**
 * ForwardDialog - 转发工单对话框
 * 功能：选择目标组织（供应商/工程公司）并转发工单
 */
export default function ForwardDialog({ visible, onClose, workOrderId, onSuccess }: ForwardDialogProps) {
  const [targetOrg, setTargetOrg] = useState<string[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      fetchOrganizations()
    }
  }, [visible])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      // 模拟获取组织列表
      setTimeout(() => {
        setOrganizations([
          { id: 'org-1', name: '工程公司A', type: 'CONTRACTOR' },
          { id: 'org-2', name: '供应商B', type: 'VENDOR' },
          { id: 'org-3', name: '工程公司C', type: 'CONTRACTOR' },
        ])
        setLoading(false)
      }, 500)
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      setLoading(false)
    }
  }

  const handleForward = async () => {
    if (!targetOrg[0]) {
      return
    }

    try {
      setLoading(true)
      await localWorkorderApi.forward(workOrderId, targetOrg[0])
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to forward work order:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {visible && (
        <Dialog
          visible={visible}
          title="转发工单"
          content={
            <div style={{ padding: '16px 0' }}>
              <Selector
                options={organizations.map(org => ({
                  label: org.name,
                  value: org.id,
                  description: org.type === 'CONTRACTOR' ? '工程公司' : '供应商',
                }))}
                value={targetOrg}
                onChange={setTargetOrg}
                columns={1}
              />
            </div>
          }
          closeOnMaskClick
          onClose={onClose}
          actions={[
            [{ key: 'cancel', text: '取消', onClick: onClose }],
            [{ key: 'confirm', text: '确认转发', onClick: handleForward, disabled: !targetOrg[0] || loading }],
          ]}
        />
      )}
    </>
  )
}
