import { useState, useEffect } from 'react'
import { Dialog, Selector } from 'antd-mobile'
import { localWorkorderApi } from '../api/local/workorder'
import { storage } from '../api/local/storage'
import { STORAGE_KEYS, User, Organization } from '../api/local/mockData'

interface ForwardDialogProps {
  visible: boolean
  onClose: () => void
  workOrderId: string
  onSuccess: () => void
  dispatchType?: 'assign' | 'distribute'
  userRole?: string
  userOrgId?: string
}

interface Engineer {
  id: string
  name: string
  username: string
}

/**
 * ForwardDialog - 指派/分配工单对话框
 * 功能：选择目标组织（供应商/工程公司）或工程师并指派/分配工单
 */
export default function ForwardDialog({ visible, onClose, workOrderId, onSuccess, dispatchType = 'assign', userRole, userOrgId }: ForwardDialogProps) {
  const [targetOrg, setTargetOrg] = useState<string[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      if (dispatchType === 'assign') {
        fetchOrganizations()
      } else {
        fetchEngineers()
      }
    }
  }, [visible, dispatchType])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const orgs = storage.get<Organization[]>(STORAGE_KEYS.ORGANIZATIONS) || []
      
      let filteredOrgs: Organization[] = []
      
      if (userRole === 'BRANCH_ADMIN' || userRole === 'EMPLOYEE') {
        // Branch users see all contractors
        filteredOrgs = orgs.filter((o) => o.type === 'MAIN_CONTRACTOR')
      } else if (userRole === 'CONTRACTOR_ADMIN' || userRole === 'CONTRACTOR_EMPLOYEE') {
        // Contractor users see vendors under their organization
        filteredOrgs = orgs.filter((o) => o.type === 'VENDOR' && o.parent_id === userOrgId)
      } else {
        filteredOrgs = []
      }
      
      setOrganizations(filteredOrgs)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      setLoading(false)
    }
  }

  const fetchEngineers = async () => {
    try {
      setLoading(true)
      const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
      
      // Filter engineers in the same organization
      const engineerList: Engineer[] = users
        .filter((u) => u.role === 'ENGINEER' && u.org_id === userOrgId)
        .map((u) => ({
          id: u.id,
          name: u.display_name || u.username,
          username: u.username,
        }))
      
      setEngineers(engineerList)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch engineers:', error)
      setLoading(false)
    }
  }

  const handleForward = async () => {
    if (!targetOrg[0]) {
      return
    }

    try {
      setLoading(true)
      if (dispatchType === 'assign') {
        await localWorkorderApi.forward(workOrderId, targetOrg[0])
      } else {
        // 分配工程师
        await localWorkorderApi.assignEngineer(workOrderId, targetOrg[0])
      }
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to forward work order:', error)
    } finally {
      setLoading(false)
    }
  }

  const isAssign = dispatchType === 'assign'

  return (
    <>
      {visible && (
        <Dialog
          visible={visible}
          title={isAssign ? '指派工单' : '分配工程师'}
          content={
            <div style={{ padding: '16px 0' }}>
              {isAssign ? (
                 <Selector
                   options={organizations.map(org => ({
                     label: org.name,
                     value: org.id,
                     description: org.type === 'MAIN_CONTRACTOR' ? '工程公司' : '供应商',
                   }))}
                   value={targetOrg}
                   onChange={setTargetOrg}
                   columns={1}
                 />
              ) : (
                <Selector
                  options={engineers.map(eng => ({
                    label: eng.name,
                    value: eng.id,
                    description: eng.username,
                  }))}
                  value={targetOrg}
                  onChange={setTargetOrg}
                  columns={1}
                />
              )}
            </div>
          }
          closeOnMaskClick
          onClose={onClose}
          actions={[
            [{ key: 'cancel', text: '取消', onClick: onClose }],
            [{ key: 'confirm', text: isAssign ? '确认指派' : '确认分配', onClick: handleForward, disabled: !targetOrg[0] || loading }],
          ]}
        />
      )}
    </>
  )
}
