export default function RoleSelector({ value, onChange }) {
  const roles = [
    { id: 'admin', label: 'Admin', desc: 'Examination Branch' },
    { id: 'faculty', label: 'Faculty', desc: 'Marks Entry Portal' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onChange(role.id)}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            value === role.id
              ? 'border-institutional-primary bg-navy-50 dark:bg-navy-900/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <span className={`block text-sm font-semibold ${value === role.id ? 'text-institutional-primary' : 'text-gray-800 dark:text-white'}`}>
            {role.label}
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">{role.desc}</span>
        </button>
      ))}
    </div>
  );
}
