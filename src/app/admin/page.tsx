'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/navbar';
import Footer from '@/components/shared/footer';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { 
  Loader2, BarChart3, LineChart, Building, Key, Users, Percent, 
  Receipt, Shield, Plus, Trash2, Edit, Calendar, ToggleLeft, ToggleRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';

interface StatCounts {
  totalRevenue: number;
  totalBookings: number;
  occupancyRate: number;
  totalCustomers: number;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { success, error, info } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'analytics' | 'hotels' | 'staff' | 'coupons' | 'taxes' | 'audit'>('analytics');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Analytics states
  const [stats, setStats] = useState<StatCounts | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [bookingStatus, setBookingStatus] = useState<any[]>([]);
  const [popularCats, setPopularCats] = useState<any[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);

  // Management listings
  const [hotels, setHotels] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);

  // Creation forms loaders
  const [formLoading, setFormLoading] = useState(false);

  // New Hotel state
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelCity, setNewHotelCity] = useState('');
  const [newHotelAddress, setNewHotelAddress] = useState('');
  const [newHotelDesc, setNewHotelDesc] = useState('');
  const [newHotelEmail, setNewHotelEmail] = useState('');
  const [newHotelPhone, setNewHotelPhone] = useState('');
  const [showHotelModal, setShowHotelModal] = useState(false);

  // New Staff state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');
  const [newStaffHotel, setNewStaffHotel] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState(25000);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // New Coupon state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [newCouponVal, setNewCouponVal] = useState(10);
  const [newCouponMin, setNewCouponMin] = useState(3000);
  const [newCouponMax, setNewCouponMax] = useState(100);
  const [newCouponStart, setNewCouponStart] = useState('');
  const [newCouponEnd, setNewCouponEnd] = useState('');
  const [showCouponModal, setShowCouponModal] = useState(false);

  const fetchAdminData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch analytics
      const analyticsRes = await fetch('/api/admin/analytics');
      const analyticsData = await analyticsRes.json();
      if (analyticsData.success) {
        setStats(analyticsData.stats);
        setMonthlyRevenue(analyticsData.monthlyRevenue);
        setBookingStatus(analyticsData.bookingStatusData);
        setPopularCats(analyticsData.popularCategories);
        setCustomerGrowth(analyticsData.customerGrowth);
        setAuditTrail(analyticsData.auditTrail);
      }

      // 2. Fetch Hotels
      const hotelsRes = await fetch('/api/hotels');
      const hotelsData = await hotelsRes.json();
      if (hotelsData.success) setHotels(hotelsData.hotels);

      // 3. Fetch Staff
      const staffRes = await fetch('/api/admin/staff');
      const staffData = await staffRes.json();
      if (staffData.success) setStaffList(staffData.staff);

      // 4. Fetch Coupons
      const couponsRes = await fetch('/api/coupons');
      const couponsData = await couponsRes.json();
      if (couponsData.success) setCoupons(couponsData.coupons);

      // 5. Fetch Taxes
      const taxesRes = await fetch('/api/taxes');
      const taxesData = await taxesRes.json();
      if (taxesData.success) setTaxes(taxesData.taxes);

    } catch (err) {
      console.error(err);
      error('Failed to retrieve dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'SUPER_ADMIN')) {
      error('Access restricted to Super Administrators.');
      router.push('/login');
      return;
    }

    if (user) {
      setMounted(true);
      fetchAdminData();
    }
  }, [user, authLoading, router]);

  // Hotel creation submit handler
  const handleHotelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelName || !newHotelCity || !newHotelAddress || !newHotelDesc || !newHotelEmail || !newHotelPhone) {
      error('Please fill in all hotel attributes');
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch('/api/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHotelName,
          description: newHotelDesc,
          address: newHotelAddress,
          city: newHotelCity,
          state: 'State',
          country: 'India',
          email: newHotelEmail,
          phone: newHotelPhone,
          // Sending stock image default so Cloudinary mock handles it easily
          images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'],
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('New hotel registered successfully!');
        setNewHotelName('');
        setNewHotelDesc('');
        setNewHotelCity('');
        setNewHotelAddress('');
        setNewHotelEmail('');
        setNewHotelPhone('');
        setShowHotelModal(false);
        fetchAdminData();
      } else {
        error(data.message || 'Hotel creation failed');
      }
    } catch (err) {
      error('Error registering hotel');
    } finally {
      setFormLoading(false);
    }
  };

  // Staff creation submit handler
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail || !newStaffPhone || !newStaffPass || !newStaffHotel) {
      error('Please fill in all staff registration details');
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStaffName,
          email: newStaffEmail,
          phone: newStaffPhone,
          password: newStaffPass,
          hotelId: newStaffHotel,
          designation: 'RECEPTIONIST',
          salary: newStaffSalary,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Receptionist hired and account created.');
        setNewStaffName('');
        setNewStaffEmail('');
        setNewStaffPhone('');
        setNewStaffPass('');
        setNewStaffHotel('');
        setShowStaffModal(false);
        fetchAdminData();
      } else {
        error(data.message || 'Staff registration failed');
      }
    } catch (err) {
      error('Error hiring staff member');
    } finally {
      setFormLoading(false);
    }
  };

  // Coupon creation submit handler
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode || !newCouponStart || !newCouponEnd) {
      error('Fill in all coupon configuration parameters');
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode,
          discountType: newCouponType,
          discountValue: newCouponVal,
          minBookingAmount: newCouponMin,
          maxUses: newCouponMax,
          startDate: newCouponStart,
          endDate: newCouponEnd,
        }),
      });

      const data = await res.json();
      if (data.success) {
        success('Promotional coupon created successfully!');
        setNewCouponCode('');
        setNewCouponStart('');
        setNewCouponEnd('');
        setShowCouponModal(false);
        fetchAdminData();
      } else {
        error(data.message || 'Coupon configuration failed');
      }
    } catch (err) {
      error('Error creating coupon');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete handlers
  const handleDeleteHotel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hotel? This deletes all associated rooms, categories, and bookings (Cascading).')) return;
    try {
      const res = await fetch(`/api/hotels/${id}`, { method: 'DELETE' });
      if ((await res.json()).success) {
        success('Hotel deleted.');
        fetchAdminData();
      }
    } catch (err) {
      error('Error deleting hotel');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Delete staff profile and login account?')) return;
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      if ((await res.json()).success) {
        success('Staff terminated.');
        fetchAdminData();
      }
    } catch (err) {
      error('Error removing staff member');
    }
  };

  // Pie chart coloring
  const COLORS = ['#d4af37', '#b89047', '#ef4444', '#10b981', '#3b82f6'];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin text-primary h-12 w-12" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Analytics Top widgets */}
        {stats && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Total Revenue</span>
              <span className="text-2xl font-bold text-foreground mt-1 block">₹{stats.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Total Reservations</span>
              <span className="text-2xl font-bold text-foreground mt-1 block">{stats.totalBookings}</span>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Average Occupancy</span>
              <span className="text-2xl font-bold text-foreground mt-1 block">{stats.occupancyRate}%</span>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Active Customers</span>
              <span className="text-2xl font-bold text-foreground mt-1 block">{stats.totalCustomers}</span>
            </div>
          </section>
        )}

        {/* Navigation Tabs */}
        <section className="flex flex-wrap border-b border-border mb-8 text-sm font-semibold gap-1">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-5 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics charts
          </button>
          <button
            onClick={() => setActiveTab('hotels')}
            className={`py-3 px-5 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'hotels' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building className="h-4 w-4" />
            Manage Hotels
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`py-3 px-5 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'staff' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            Manage Staff
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`py-3 px-5 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'coupons' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Percent className="h-4 w-4" />
            Manage Coupons
          </button>
          <button
            onClick={() => setActiveTab('taxes')}
            className={`py-3 px-5 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'taxes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Taxes Config
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-5 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="h-4 w-4" />
            Audit Trail
          </button>
        </section>

        {/* Tab Board container */}
        <section className="bg-card border border-border p-8 rounded-xl min-h-[500px]">
          
          {/* Recharts Analytics Charts Tab */}
          {activeTab === 'analytics' && mounted && (
            <div className="space-y-12">
              <div>
                <h2 className="text-2xl font-serif text-foreground font-semibold">Hospitality Analytics Summary</h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-sans">Visual trends for financial revenue, checkouts volume, and room category popularity</p>
              </div>

              {/* Row 1: Area Revenue and Customer Growth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Revenue chart */}
                <div className="bg-muted/10 border border-border p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <LineChart className="h-4.5 w-4.5 text-primary" /> Monthly Revenue Trend
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyRevenue}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={10} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#d4af37" fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Customer growth */}
                <div className="bg-muted/10 border border-border p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-4.5 w-4.5 text-primary" /> Customer Growth Trend
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={customerGrowth}>
                        <defs>
                          <linearGradient id="colorCust" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={10} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                        <Tooltip />
                        <Area type="monotone" dataKey="customers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCust)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Row 2: Popular Rooms and Booking Statuses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Popular room categories bar chart */}
                <div className="bg-muted/10 border border-border p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Suite Category Bookings Volume</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={popularCats}>
                        <XAxis dataKey="categoryName" stroke="var(--muted-foreground)" fontSize={8} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="bookingsCount" fill="#d4af37" radius={[4, 4, 0, 0]}>
                          {popularCats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Booking status distribution */}
                <div className="bg-muted/10 border border-border p-6 rounded-xl space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Booking Status Distribution</h3>
                  <div className="h-64 flex items-center justify-center">
                    {bookingStatus.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No booking statuses record compiled</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={bookingStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="status"
                            label
                          >
                            {bookingStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manage Hotels Tab */}
          {activeTab === 'hotels' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-serif text-foreground font-semibold">Registered Hotel Branches</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage details of physical hotel locations and branches</p>
                </div>
                <button
                  onClick={() => setShowHotelModal(true)}
                  className="rounded bg-primary text-primary-foreground font-semibold px-4 py-2 text-xs hover:bg-primary/90 transition shadow flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add Hotel
                </button>
              </div>

              {/* Hotels table */}
              <div className="overflow-x-auto border border-border rounded-lg text-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                      <th className="p-4">Resort Branch</th>
                      <th className="p-4">City</th>
                      <th className="p-4">Contact Info</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground">
                    {hotels.map((h) => (
                      <tr key={h.id} className="hover:bg-muted/10">
                        <td className="p-4 font-semibold text-foreground">{h.name}</td>
                        <td className="p-4">{h.city}</td>
                        <td className="p-4 text-xs">{h.email}<br />{h.phone}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            h.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteHotel(h.id)}
                            className="p-1.5 rounded hover:bg-red-500/5 text-red-500 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manage Staff Tab */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-serif text-foreground font-semibold">Employee Registry</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Hire receptionists and assign them to hotel branches</p>
                </div>
                <button
                  onClick={() => setShowStaffModal(true)}
                  className="rounded bg-primary text-primary-foreground font-semibold px-4 py-2 text-xs hover:bg-primary/90 transition shadow flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Hire Staff
                </button>
              </div>

              {/* Staff table */}
              <div className="overflow-x-auto border border-border rounded-lg text-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                      <th className="p-4">Employee Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Branch Assignment</th>
                      <th className="p-4">Monthly Salary</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground">
                    {staffList.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/10">
                        <td className="p-4">
                          <span className="font-semibold text-foreground block">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground">{s.designation}</span>
                        </td>
                        <td className="p-4">{s.email}</td>
                        <td className="p-4">{s.hotelName}</td>
                        <td className="p-4 font-semibold text-foreground">₹{s.salary.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteStaff(s.id)}
                            className="p-1.5 rounded hover:bg-red-500/5 text-red-500 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manage Coupons Tab */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-serif text-foreground font-semibold">Promotional Discount Coupons</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage codes, discount values, minimum spends, and validity end-dates</p>
                </div>
                <button
                  onClick={() => setShowCouponModal(true)}
                  className="rounded bg-primary text-primary-foreground font-semibold px-4 py-2 text-xs hover:bg-primary/90 transition shadow flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add Coupon
                </button>
              </div>

              {/* Coupons Table */}
              <div className="overflow-x-auto border border-border rounded-lg text-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                      <th className="p-4">Coupon Code</th>
                      <th className="p-4">Discount Value</th>
                      <th className="p-4">Min Booking Amount</th>
                      <th className="p-4">Usage Counts</th>
                      <th className="p-4">Validity End Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground font-mono text-xs">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/10">
                        <td className="p-4 font-bold text-foreground tracking-wide font-sans text-sm">{c.code}</td>
                        <td className="p-4 font-semibold text-foreground">
                          {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% Off` : `₹${c.discountValue} Off`}
                        </td>
                        <td className="p-4">₹{c.minBookingAmount}</td>
                        <td className="p-4">{c.usesCount} / {c.maxUses}</td>
                        <td className="p-4 font-sans">{new Date(c.endDate).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {c.isActive ? 'ACTIVE' : 'EXPIRED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Taxes configuration Tab */}
          {activeTab === 'taxes' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif text-foreground font-semibold">Tax Configurations</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Define active taxes (CGST, SGST, Luxury) automatically calculated on booking bills</p>
              </div>

              {/* Taxes table */}
              <div className="max-w-xl border border-border rounded-lg text-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                      <th className="p-4">Tax Type</th>
                      <th className="p-4">Rate (%)</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground">
                    {taxes.map((t) => (
                      <tr key={t.id}>
                        <td className="p-4 font-semibold text-foreground">{t.name}</td>
                        <td className="p-4 font-mono">{t.rate}%</td>
                        <td className="p-4 text-center text-xs font-bold text-green-500">
                          {t.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Trail Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif text-foreground font-semibold">Security Audit Logs</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Live log stream of critical employee creations, guest logins, check-ins, check-outs, and cancellations</p>
              </div>

              {/* Logs list */}
              <div className="overflow-x-auto border border-border rounded-lg text-xs font-mono">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                      <th className="p-4">Log Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Details Summary</th>
                      <th className="p-4">Trigger User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground">
                    {auditTrail.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/10">
                        <td className="p-4 font-sans text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                            log.action.includes('LOGIN') ? 'bg-blue-500/10 text-blue-500' : 'bg-primary/10 text-primary'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-foreground font-sans text-xs leading-relaxed">{log.details}</td>
                        <td className="p-4 font-sans text-xs">{log.userName}<br />{log.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </section>
      </main>

      {/* Hotel creation modal */}
      {showHotelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl space-y-6 animate-scale-up">
            <div>
              <h3 className="text-xl font-serif font-semibold text-foreground">Register Hotel Branch</h3>
              <p className="text-xs text-muted-foreground mt-1">Configure details for a new physical hotel branch</p>
            </div>

            <form onSubmit={handleHotelSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hotel Name</label>
                  <input
                    type="text"
                    value={newHotelName}
                    onChange={(e) => setNewHotelName(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">City Location</label>
                  <input
                    type="text"
                    value={newHotelCity}
                    onChange={(e) => setNewHotelCity(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Physical Address</label>
                <input
                  type="text"
                  value={newHotelAddress}
                  onChange={(e) => setNewHotelAddress(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Brief Description</label>
                <textarea
                  value={newHotelDesc}
                  onChange={(e) => setNewHotelDesc(e.target.value)}
                  rows={2}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hotel Email</label>
                  <input
                    type="email"
                    value={newHotelEmail}
                    onChange={(e) => setNewHotelEmail(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    value={newHotelPhone}
                    onChange={(e) => setNewHotelPhone(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowHotelModal(false)}
                  className="flex-1 rounded border border-border py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-primary text-primary-foreground py-2 text-xs font-semibold hover:bg-primary/90 transition shadow cursor-pointer"
                  disabled={formLoading}
                >
                  {formLoading ? 'Creating...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff creation modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl space-y-6 animate-scale-up">
            <div>
              <h3 className="text-xl font-serif font-semibold text-foreground">Hire Receptionist Employee</h3>
              <p className="text-xs text-muted-foreground mt-1">Configure front desk credentials and branch assignments</p>
            </div>

            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Employee Name</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Employee Login Email</label>
                <input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Temporary Password</label>
                <input
                  type="password"
                  value={newStaffPass}
                  onChange={(e) => setNewStaffPass(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Branch Assignment</label>
                  <select
                    value={newStaffHotel}
                    onChange={(e) => setNewStaffHotel(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none w-full"
                  >
                    <option value="">-- Choose Hotel --</option>
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={newStaffSalary}
                    onChange={(e) => setNewStaffSalary(parseInt(e.target.value, 10) || 0)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="flex-1 rounded border border-border py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-primary text-primary-foreground py-2 text-xs font-semibold hover:bg-primary/90 transition shadow cursor-pointer"
                  disabled={formLoading}
                >
                  {formLoading ? 'Hiring...' : 'Hire Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon creation modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border p-6 rounded-xl shadow-2xl space-y-6 animate-scale-up">
            <div>
              <h3 className="text-xl font-serif font-semibold text-foreground">Add Discount Coupon</h3>
              <p className="text-xs text-muted-foreground mt-1">Configure parameters for promotional coupons</p>
            </div>

            <form onSubmit={handleCouponSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g. MONSOON20"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Discount Type</label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as 'PERCENTAGE' | 'FLAT')}
                    className="rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none w-full"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Rate (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Discount Value</label>
                  <input
                    type="number"
                    value={newCouponVal}
                    onChange={(e) => setNewCouponVal(parseFloat(e.target.value) || 0)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Min Spend (₹)</label>
                  <input
                    type="number"
                    value={newCouponMin}
                    onChange={(e) => setNewCouponMin(parseFloat(e.target.value) || 0)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Max Uses Limit</label>
                  <input
                    type="number"
                    value={newCouponMax}
                    onChange={(e) => setNewCouponMax(parseInt(e.target.value, 10) || 100)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Validity Start Date</label>
                  <input
                    type="date"
                    value={newCouponStart}
                    onChange={(e) => setNewCouponStart(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Validity End Date</label>
                  <input
                    type="date"
                    value={newCouponEnd}
                    onChange={(e) => setNewCouponEnd(e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="flex-1 rounded border border-border py-2 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-primary text-primary-foreground py-2 text-xs font-semibold hover:bg-primary/90 transition shadow cursor-pointer"
                  disabled={formLoading}
                >
                  {formLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
