import LoanDashboard from '@/components/LoanDashboard'

export default function LoansPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loans</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Request and manage loans from your group savings pool
        </p>
      </div>
      <LoanDashboard groupId="" />
    </div>
  )
}
