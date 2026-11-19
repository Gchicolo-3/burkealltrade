import CustomerForm from '@/components/CustomerForm';

export default function NewCustomer() {
  return (
    <div className="space-y-4 pt-2">
      <h1 className="h1">Add customer</h1>
      <CustomerForm customer={null} />
    </div>
  );
}
