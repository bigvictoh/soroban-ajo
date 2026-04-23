import EmergencyFund from '@/components/EmergencyFund'

export default function EmergencyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency Fund</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Request urgent withdrawals with fast group approval (24h voting window)
        </p>
      </div>
      <EmergencyFund groupId="" />
    </div>
  )
}
