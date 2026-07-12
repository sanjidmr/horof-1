'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, Loader2, ShoppingCart, Home, 
  MapPin, Phone, User, Map, FileText,
  Banknote, CheckCircle2, Navigation, Truck, Sparkles,
  Store, Clock
} from 'lucide-react';
import Link from 'next/link';
import { getCheckoutItems, CheckoutItem, clearCheckoutItems } from '@/lib/checkoutStorage';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { placeOrder } from '@/lib/actions/place-order';
import { toast } from 'react-hot-toast';

// Bangladesh Districts grouped by Division
const BANGLADESH_DISTRICTS: Record<string, string[]> = {
  "Dhaka Division": ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
  "Mymensingh Division": ["Mymensingh", "Jamalpur", "Netrokona", "Sherpur"],
  "Chittagong Division": ["Chittagong", "Cox's Bazar", "Comilla", "Feni", "Brahmanbaria", "Chandpur", "Lakshmipur", "Noakhali", "Rangamati", "Khagrachhari", "Bandarban"],
  "Rajshahi Division": ["Rajshahi", "Bogra", "Pabna", "Naogaon", "Natore", "Sirajganj", "Joypurhat", "Chapainawabganj"],
  "Sylhet Division": ["Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"],
  "Khulna Division": ["Khulna", "Jessore", "Satkhira", "Bagerhat", "Kushtia", "Jhenaidah", "Chuadanga", "Meherpur", "Narail", "Magura"],
  "Barisal Division": ["Barisal", "Patuakhali", "Bhola", "Pirojpur", "Barguna", "Jhalokati"],
  "Rangpur Division": ["Rangpur", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Thakurgaon", "Panchagarh"]
};

// Thanas grouped by District
const THANAS_BY_DISTRICT: Record<string, string[]> = {
  "Dhaka": ["Mirpur", "Uttara", "Dhanmondi", "Gulshan", "Banani", "Badda", "Motijheel", "Mohammadpur", "Khilgaon", "Tejgaon", "Ramna", "Cantonment", "Demra", "Hazaribagh", "Lalbagh", "Sutrapur", "Kotwali", "Wari", "Kafrul", "Pallabi", "Shah Ali", "Airport", "Turag", "Dakshinkhan", "Uttarkhan", "Khilkhet", "Vatara", "Rampura", "Sabujbagh", "Mugda", "Jatrabari", "Shyampur", "Kadamtali", "Kamrangirchar", "Chawkbazar", "Gendaria", "Keraniganj", "Savar", "Dhamrai", "Dohar", "Nawabganj"],
  "Faridpur": ["Faridpur Sadar", "Bhanga", "Boalmari", "Sadarpur", "Madhukhali", "Saltha", "Nagarkanda", "Alfadanga", "Charbhadrasan"],
  "Gazipur": ["Gazipur Sadar", "Tongi", "Sreepur", "Kaliakair", "Kapasia", "Kaliganj"],
  "Gopalganj": ["Gopalganj Sadar", "Tungipara", "Kotalipara", "Muksudpur", "Kashiani"],
  "Kishoreganj": ["Kishoreganj Sadar", "Bhairab", "Bajitpur", "Karimganj", "Katiadi", "Kuliarchar", "Pakundia", "Tarail", "Itna", "Mithamain", "Nikli", "Ashtagram", "Hossainpur"],
  "Madaripur": ["Madaripur Sadar", "Shibchar", "Kalkini", "Rajoir"],
  "Manikganj": ["Manikganj Sadar", "Singair", "Shibalaya", "Saturia", "Harirampur", "Ghior", "Daulatpur"],
  "Munshiganj": ["Munshiganj Sadar", "Sreenagar", "Sirajdikhan", "Lohajang", "Tongibari", "Gazaria"],
  "Narayanganj": ["Narayanganj Sadar", "Bandar", "Sonargaon", "Rupganj", "Araihazar"],
  "Narsingdi": ["Narsingdi Sadar", "Madhabdi", "Belabo", "Monohardi", "Palash", "Raipura", "Shibpur"],
  "Rajbari": ["Rajbari Sadar", "Pangsha", "Baliakandi", "Goalandaghat", "Kalukhali"],
  "Shariatpur": ["Shariatpur Sadar", "Naria", "Jajira", "Damudya", "Bhedarganj", "Gosairhat"],
  "Tangail": ["Tangail Sadar", "Mirzapur", "Kalihati", "Ghatail", "Sakhipur", "Madhupur", "Gopalpur", "Bhuapur", "Basail", "Delduar", "Nagarpur", "Dhanbari"],

  "Mymensingh": ["Mymensingh Sadar", "Trishal", "Bhaluka", "Muktagachha", "Gafargaon", "Ishwarganj", "Haluaghat", "Phulpur", "Dhobaura", "Nandail", "Phulbaria", "Gouripur"],
  "Jamalpur": ["Jamalpur Sadar", "Sarishabari", "Melandaha", "Dewanganj", "Bakshiganj", "Madarganj", "Isampur"],
  "Netrokona": ["Netrokona Sadar", "Mohanganj", "Madan", "Khaliajuri", "Kalmakanda", "Durgapur", "Kendua", "Atpara", "Barhatta", "Purbadhala"],
  "Sherpur": ["Sherpur Sadar", "Nakla", "Nalitabari", "Jhenaigati", "Sreebardi"],

  "Chittagong": ["Kotwali", "Double Mooring", "Panchlaish", "Halishahar", "Patenga", "Bandar", "Bayazid", "Chandgaon", "Bakalia", "Khulshi", "Akbar Shah", "Karnaphuli", "Hathazari", "Raozan", "Rangunia", "Patiya", "Boalkhali", "Anwara", "Chandanaish", "Satkania", "Lohagara", "Banshkhali", "Sandwip", "Sitakunda", "Mirsharai"],
  "Cox's Bazar": ["Cox's Bazar Sadar", "Chakaria", "Maheshkhali", "Teknaf", "Ukhiya", "Ramu", "Pekua", "Kutubdia"],
  "Comilla": ["Comilla Sadar", "Sadar South", "Laksam", "Debidwar", "Daudkandi", "Chauddagram", "Barura", "Burichang", "Chandina", "Homna", "Muradnagar", "Langalkot", "Meghna", "Titas", "Monohorganj"],
  "Feni": ["Feni Sadar", "Daganbhuiyan", "Chhagalnaiya", "Sonagazi", "Parshuram", "Fulgazi"],
  "Brahmanbaria": ["Brahmanbaria Sadar", "Ashuganj", "Bancharampur", "Kasba", "Nabinagar", "Nasirnagar", "Sarail", "Akhaura", "Bijoynagar"],
  "Chandpur": ["Chandpur Sadar", "Hajiganj", "Faridganj", "Matlab South", "Matlab North", "Shahrasti", "Kachua", "Haimchar"],
  "Lakshmipur": ["Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati", "Kamalnagar"],
  "Noakhali": ["Noakhali Sadar", "Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar", "Kabirhat"],
  "Rangamati": ["Rangamati Sadar", "Kaptai", "Kawkhali", "Baghaichhari", "Barkal", "Juraichhari", "Langadu", "Naniarchar", "Rajasthali", "Bilaichhari"],
  "Khagrachhari": ["Khagrachhari Sadar", "Dighinala", "Panchhari", "Laxmichhari", "Mahalchhari", "Manikchhari", "Ramgarh", "Matiranga", "Guimara"],
  "Bandarban": ["Bandarban Sadar", "Alikadam", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"],

  "Rajshahi": ["Boalia", "Matihar", "Rajputore", "Shah Makhdum", "Paba", "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Puthia", "Tanore"],
  "Bogra": ["Bogra Sadar", "Shajahanpur", "Sherpur", "Dhunat", "Gabtali", "Kahaloo", "Nandigram", "Dupchanchia", "Adamdighi", "Shibganj", "Sonatola", "Sariakandi"],
  "Pabna": ["Pabna Sadar", "Ishwardi", "Atgharia", "Santhia", "Chatmohar", "Faridpur", "Bera", "Sujanagar", "Bhangura"],
  "Naogaon": ["Naogaon Sadar", "Niamatpur", "Manda", "Raninagar", "Atrai", "Badalgachhi", "Dhamoirhat", "Mahadebpur", "Patnitala", "Porsha", "Sapahar"],
  "Natore": ["Natore Sadar", "Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Singra", "Naldanga"],
  "Sirajganj": ["Sirajganj Sadar", "Belkuchi", "Kamarkhanda", "Kazipur", "Rayganj", "Shahjadpur", "Tarash", "Ullahpara", "Chouhali"],
  "Joypurhat": ["Joypurhat Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"],
  "Chapainawabganj": ["Chapainawabganj Sadar", "Shibganj", "Gomastapur", "Nachole", "Bholahat"],

  "Sylhet": ["Sylhet Sadar", "Beanibazar", "Bishwanath", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Balaganj", "Companiganj", "Zakiganj", "South Surma"],
  "Moulvibazar": ["Moulvibazar Sadar", "Barlekha", "Juri", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal"],
  "Habiganj": ["Habiganj Sadar", "Bahubal", "Madhabpur", "Chunarughat", "Lakhai", "Nabiganj", "Ajmiriganj", "Baniachong", "Shaistaganj"],
  "Sunamganj": ["Sunamganj Sadar", "South Sunamganj", "Chhatak", "Jagannathpur", "Derai", "Dharamapasha", "Dowarabazar", "Tahirpur", "Jamalganj", "Sullah", "Bishwambharpur"],

  "Khulna": ["Khulna Sadar", "Sonadanga", "Khalishpur", "Daulatpur", "Khan Jahan Ali", "Rupsha", "Batiaghata", "Dacope", "Dumuria", "Phultala", "Koyra", "Paikgachha", "Terokhada"],
  "Jessore": ["Jessore Sadar", "Abhaynagar", "Bagherpara", "Chougachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
  "Satkhira": ["Satkhira Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"],
  "Bagerhat": ["Bagerhat Sadar", "Mongla", "Morrelganj", "Sarankhola", "Rampal", "Fakirhat", "Kachua", "Chitalmari", "Mollahat"],
  "Kushtia": ["Kushtia Sadar", "Kumarkhali", "Khoksa", "Mirpur", "Daulatpur", "Bheramara"],
  "Jhenaidah": ["Jhenaidah Sadar", "Harinakundu", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
  "Chuadanga": ["Chuadanga Sadar", "Alamdanga", "Damurhuda", "Jibannagar"],
  "Meherpur": ["Meherpur Sadar", "Gangni", "Mujibnagar"],
  "Narail": ["Narail Sadar", "Kalia", "Lohagara"],
  "Magura": ["Magura Sadar", "Mohammadpur", "Shalikha", "Sreepur"],

  "Barisal": ["Barisal Sadar", "Bakerganj", "Babuganj", "Banaripara", "Gournadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur", "Agailjhara"],
  "Patuakhali": ["Patuakhali Sadar", "Bauphal", "Galachipa", "Kalapara", "Mirzaganj", "Dumki", "Dashmina", "Rangabali"],
  "Bhola": ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
  "Pirojpur": ["Pirojpur Sadar", "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad", "Indurkani"],
  "Barguna": ["Barguna Sadar", "Amtali", "Bamna", "Patharghata", "Betagi", "Taltali"],
  "Jhalokati": ["Jhalokati Sadar", "Kathalia", "Nalchity", "Rajapur"],

  "Rangpur": ["Rangpur Sadar", "Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj"],
  "Dinajpur": ["Dinajpur Sadar", "Birganj", "Biral", "Bochaganj", "Kaharole", "Khansama", "Ghoraghat", "Hakimpur", "Chirirbandar", "Phulbari", "Nawabganj", "Parbatipur"],
  "Gaibandha": ["Gaibandha Sadar", "Sadullapur", "Gobindaganj", "Sundarganj", "Saghata", "Phulchhari", "Palashbari"],
  "Kurigram": ["Kurigram Sadar", "Nageshwari", "Bhurungamari", "Phulbari", "Rajarhat", "Ulipur", "Chilmari", "Rowmari", "Char Rajibpur"],
  "Lalmonirhat": ["Lalmonirhat Sadar", "Aditmari", "Kaliganj", "Hatibandha", "Patgram"],
  "Nilphamari": ["Nilphamari Sadar", "Saidpur", "Jaldhaka", "Domar", "Dimla", "Kishoreganj"],
  "Thakurgaon": ["Thakurgaon Sadar", "Baliadangi", "Haripur", "Ranisankail", "Pirganj"],
  "Panchagarh": ["Panchagarh Sadar", "Boda", "Debiganj", "Atwari", "Tetulia"]
};

// Preset common areas for popular Thanas
const AREAS_BY_THANA: Record<string, string[]> = {
  "Mirpur": ["Mirpur 1", "Mirpur 2", "Mirpur 10", "Mirpur 11", "Mirpur 12", "Mirpur 14", "Pallabi", "Kazipara", "Shewrapara"],
  "Dhanmondi": ["Dhanmondi R/A", "Zigatola", "Kalabagan", "Sobhanbagh", "Rayerbazar", "Sankar"],
  "Gulshan": ["Gulshan 1", "Gulshan 2", "Niketan", "Baridhara", "Tejgaon"],
  "Uttara": ["Sector 1", "Sector 3", "Sector 4", "Sector 7", "Sector 10", "Sector 11", "Sector 12", "Sector 13", "Sector 14", "Uttara Model Town"],
  "Badda": ["Middle Badda", "North Badda", "South Badda", "Merul Badda", "Vatara", "Satarkul"],
  "Mohammadpur": ["Adabor", "Shekhartek", "Kaderabad Housing", "Mohammadpur Housing", "Basila", "Town Hall"],
  "Savar": ["Savar Bazar", "EPZ Area", "Hemayetpur", "Ashulia", "Nabinagar", "Jahangirnagar University"],
  "Keraniganj": ["Zinjira", "Keraniganj Sadar", "Hasnabad", "Kadamtali", "Rohitpur"],
  "Mymensingh Sadar": ["Ganginarpar", "Charpara", "Patgola", "Town Hall", "Kewatkhali", "Akua", "Sankipara", "Chawk Bazaar", "Maskanda", "Valuka More"],
  "Bhaluka": ["Bhaluka Bazar", "Hajir Bazar", "Valuka Industrial Area", "Seedstore", "Meherabari"],
  "Trishal": ["Trishal Bazar", "Kabi Nazrul University Area", "Kazir Shimla", "Balipara"],
  "Kotwali": ["Chowk Bazar", "Laldighi", "Reazuddin Bazar", "Anderkilla"],
  "Halishahar": ["Halishahar Housing Estate", "Naya Bazar", "Chowdhury Para"],
  "Panchlaish": ["2 No. Gate", "Muradpur", "Chawkbazar", "Sholashahar"],
  "Sylhet Sadar": ["Zindabazar", "Bandarbazar", "Ambarkhana", "Uposhahar", "Shibgonj", "Kumarpara"]
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Delivery Method state: 'online' (Home/Online Delivery) or 'office' (Office Pickup)
  const [deliveryMethod, setDeliveryMethod] = useState<'online' | 'office'>('online');

  // Customer Information State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    district: '',
    thana: '',
    area: '',
    address: '',
    note: '',
  });

  const [customArea, setCustomArea] = useState('');

  // Delivery & Payment State
  const [deliveryType, setDeliveryType] = useState<'inside_mymensingh' | 'outside_mymensingh' | null>(null);
  const [paymentMethod] = useState<'cod'>('cod');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?next=%2Fcheckout');
      return;
    }
    const loadedItems = getCheckoutItems();
    if (loadedItems && loadedItems.length > 0) {
      setItems(loadedItems);
    }
    setIsLoaded(true);
  }, [user, authLoading, router]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryCharge = deliveryMethod === 'office' ? 0 : (deliveryType === 'inside_mymensingh' ? 60 : deliveryType === 'outside_mymensingh' ? 120 : 0);
  const total = subtotal + deliveryCharge;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const district = e.target.value;
    
    // Auto delivery calculation
    if (district === 'Mymensingh') {
      setDeliveryType('inside_mymensingh');
    } else if (district) {
      setDeliveryType('outside_mymensingh');
    } else {
      setDeliveryType(null);
    }

    setFormData(prev => ({
      ...prev,
      district,
      thana: '',
      area: '',
    }));
    setCustomArea('');
  };

  const handleThanaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const thana = e.target.value;
    setFormData(prev => ({
      ...prev,
      thana,
      area: '',
    }));
    setCustomArea('');
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deliveryMethod === 'online' && !deliveryType) {
      toast.error("Please select a delivery option");
      return;
    }

    // Strict Phone Number Validation
    if (!/^01\d{9}$/.test(formData.phone)) {
      toast.error("Please enter a valid 11-digit Bangladeshi phone number starting with 01");
      return;
    }

    setLoading(true);

    const finalArea = formData.area === 'custom' || !AREAS_BY_THANA[formData.thana] ? customArea : formData.area;
    
    // Address override for Office Pickup
    const fullAddress = deliveryMethod === 'office'
      ? `Office Pickup - Customer will collect from Studio/Office (Dhopakhola More, Mymensingh). Note: ${formData.note}`
      : `${formData.address}, ${finalArea}, ${formData.thana}, ${formData.district}. Note: ${formData.note}`;

    const charge = deliveryMethod === 'office' ? 0 : deliveryCharge;
    const finalDeliveryType = deliveryMethod === 'office' ? 'office_pickup' : (deliveryType || 'inside_mymensingh');

    // Cash on Delivery flow
    try {
      const res = await placeOrder({
        customer_name: formData.name,
        customer_email: user?.email || '',
        customer_phone: formData.phone,
        customer_address: fullAddress,
        delivery_charge: charge,
        delivery_type: finalDeliveryType,
        total: subtotal + charge,
        items: items.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          unit_price: i.price,
          name: i.name,
          selectedSpecs: i.selectedSpecs,
          designCharge: i.designCharge,
          customerNotes: i.customerNotes,
          originalPrice: i.originalPrice,
          discountPercent: i.discountPercent,
          discountAmount: i.discountAmount,
          finalTotal: i.finalTotal
        }))
      });

      if (res.ok) {
        clearCart();
        clearCheckoutItems();
        toast.success("Order placed successfully!");
        router.push(`/order-confirmed?id=${res.orderId}`);
      } else {
        toast.error(res.message || "Failed to place order");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-[#1a4731]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center pt-28 pb-16 md:pt-36 md:pb-24 p-4">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-slate-100">
          <ShoppingCart className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8 text-center max-w-sm">It looks like you haven't added any premium items to your cart yet.</p>
        <Link href="/" className="inline-flex items-center px-8 py-4 bg-[#1a4731] text-white font-bold rounded-xl hover:bg-[#14402a] hover:-translate-y-1 transition-all shadow-lg shadow-[#1a4731]/20 uppercase tracking-widest text-xs">
          <Home className="w-4 h-4 mr-2" />
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pt-28 pb-16 md:pt-36 md:pb-24 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-10 text-center md:text-left animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1a4731]/10 text-[#1a4731] text-[10px] uppercase tracking-widest font-black rounded-full mb-3 select-none">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure & Zero Risk Shopping
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1a4731] mb-2">Checkout Details</h1>
          <p className="text-slate-500">Provide your delivery info to confirm your order via Cash on Delivery</p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 flex-col-reverse lg:flex-row">
          
          {/* Left Side: Forms */}
          <div className="w-full lg:w-7/12 space-y-8">
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-8">
              
              {/* Step 1: Delivery Method Selection */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1a4731]" />
                <h2 className="text-xl font-display font-bold mb-6 flex items-center text-slate-800">
                  <span className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#1a4731] flex items-center justify-center mr-3 text-sm font-bold">1</span>
                  Delivery Method
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Online Delivery */}
                  <div 
                    onClick={() => setDeliveryMethod('online')}
                    className={`rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
                      deliveryMethod === 'online' 
                        ? 'border-[#1a4731] bg-[#f0fdf4]/20 shadow-sm shadow-[#1a4731]/10' 
                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        deliveryMethod === 'online' ? 'bg-[#1a4731]/10 text-[#1a4731]' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Online Delivery</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Standard home delivery to your doorstep via courier.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Charge: ৳60 / ৳120</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        deliveryMethod === 'online' ? 'border-[#1a4731]' : 'border-slate-300'
                      }`}>
                        {deliveryMethod === 'online' && <div className="w-2.5 h-2.5 rounded-full bg-[#1a4731]" />}
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Office Pickup */}
                  <div 
                    onClick={() => setDeliveryMethod('office')}
                    className={`rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
                      deliveryMethod === 'office' 
                        ? 'border-[#1a4731] bg-[#f0fdf4]/20 shadow-sm shadow-[#1a4731]/10' 
                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        deliveryMethod === 'office' ? 'bg-[#1a4731]/10 text-[#1a4731]' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Office Pickup (On Office)</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Collect your order directly from our Mymensingh studio.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-600">Charge: Free (৳0)</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        deliveryMethod === 'office' ? 'border-[#1a4731]' : 'border-slate-300'
                      }`}>
                        {deliveryMethod === 'office' && <div className="w-2.5 h-2.5 rounded-full bg-[#1a4731]" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Step 2: Customer / Shipping Info */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1a4731]" />
                <h2 className="text-xl font-display font-bold mb-6 flex items-center text-slate-800">
                  <span className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#1a4731] flex items-center justify-center mr-3 text-sm font-bold">2</span>
                  {deliveryMethod === 'online' ? 'Shipping Information' : 'Pickup Contact Information'}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {deliveryMethod === 'office' && (
                    <div className="md:col-span-2 p-5 bg-[#f0fdf4]/40 border border-[#1a4731]/10 rounded-2xl space-y-4 animate-in fade-in duration-300 mb-2">
                      <div className="flex items-center gap-2 text-[#1a4731]">
                        <Store className="w-4 h-4 shrink-0" />
                        <h4 className="font-bold text-sm">Collection Studio Details</h4>
                      </div>
                      <div className="space-y-2 text-xs text-slate-700 leading-relaxed font-medium">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span><strong>Address:</strong> Dhopakhola More, Mymensingh</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span><strong>Hours:</strong> Sat – Fri: 9am – 6pm (Thur: 10am – 4pm)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span><strong>Studio Contact:</strong> +880 1723 8900, +880 1938 4948</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 italic">
                        * Please verify your contact details below. We will contact you when your order is ready for collection.
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" name="name" required value={formData.name} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel" name="phone" required pattern="01\d{9}" title="11 digits starting with 01" value={formData.phone} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>

                  {deliveryMethod === 'online' && (
                    <>
                      <div className="space-y-1.5 animate-in fade-in duration-300">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Map className="w-3.5 h-3.5 text-slate-400" /> District <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="district" required={deliveryMethod === 'online'} value={formData.district} onChange={handleDistrictChange}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none"
                        >
                          <option value="">Select District</option>
                          {Object.entries(BANGLADESH_DISTRICTS).map(([division, districts]) => (
                            <optgroup key={division} label={division}>
                              {districts.map(dist => (
                                <option key={dist} value={dist}>{dist}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 animate-in fade-in duration-300">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> Thana/Upazila <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="thana" required={deliveryMethod === 'online'} disabled={!formData.district} value={formData.thana} onChange={handleThanaChange}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none disabled:opacity-50"
                        >
                          <option value="">Select Thana/Upazila</option>
                          {formData.district && THANAS_BY_DISTRICT[formData.district] && 
                            THANAS_BY_DISTRICT[formData.district].map(thana => (
                              <option key={thana} value={thana}>{thana}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="space-y-1.5 animate-in fade-in duration-300">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Navigation className="w-3.5 h-3.5 text-slate-400" /> Area <span className="text-red-500">*</span>
                        </label>
                        {formData.thana && AREAS_BY_THANA[formData.thana] ? (
                          <div className="space-y-2">
                            <select
                              name="area" required={deliveryMethod === 'online'} value={formData.area} onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => ({ ...prev, area: val }));
                                if (val !== 'custom') setCustomArea('');
                              }}
                              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none"
                            >
                              <option value="">Select Area</option>
                              {AREAS_BY_THANA[formData.thana].map(area => (
                                <option key={area} value={area}>{area}</option>
                              ))}
                              <option value="custom">Other / Type Custom Area...</option>
                            </select>
                            {formData.area === 'custom' && (
                              <input
                                type="text" required={deliveryMethod === 'online' && formData.area === 'custom'} value={customArea} onChange={(e) => setCustomArea(e.target.value)}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none animate-in fade-in duration-300"
                                placeholder="Enter your custom area name"
                              />
                            )}
                          </div>
                        ) : (
                          <input
                            type="text" name="area" required={deliveryMethod === 'online'} disabled={!formData.thana} value={formData.thana ? (formData.area === 'custom' ? customArea : formData.area) : ''} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(prev => ({ ...prev, area: 'custom' }));
                              setCustomArea(val);
                            }}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none disabled:opacity-50"
                            placeholder={formData.thana ? "Type your Village/Area/Neighborhood" : "Select Thana first"}
                          />
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-1.5 animate-in fade-in duration-300">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Home className="w-3.5 h-3.5 text-slate-400" /> Exact Address / House No <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="address" required={deliveryMethod === 'online'} rows={2} value={formData.address} onChange={handleInputChange}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none resize-none"
                          placeholder="e.g. House 42, Road 11, Flat 4B"
                        />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> Extra Location Note <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <textarea
                      name="note" rows={2} value={formData.note} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none resize-none"
                      placeholder={deliveryMethod === 'online' ? "Any landmark or specific instructions for delivery man" : "Preferred collection day or other notes"}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Delivery Option (Only for Online Delivery) */}
              {deliveryMethod === 'online' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1a4731]" />
                  <h2 className="text-xl font-display font-bold mb-6 flex items-center text-slate-800">
                    <span className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#1a4731] flex items-center justify-center mr-3 text-sm font-bold">3</span>
                    Delivery System
                  </h2>
                  {!formData.district ? (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100/80 text-center">
                      <Truck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600">Please select your district first</p>
                      <p className="text-xs text-slate-400 mt-1">Delivery charge will be calculated automatically based on your district.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                      <div 
                        className={`rounded-2xl border-2 p-5 transition-all duration-300 ${deliveryType === 'inside_mymensingh' ? 'border-[#1a4731] bg-[#f0fdf4]/30 shadow-sm shadow-[#1a4731]/10' : 'border-slate-100 bg-slate-50/50 opacity-40 pointer-events-none'}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${deliveryType === 'inside_mymensingh' ? 'border-[#1a4731]' : 'border-slate-300'}`}>
                            {deliveryType === 'inside_mymensingh' && <div className="w-2.5 h-2.5 rounded-full bg-[#1a4731]" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 justify-between">
                              <h4 className={`font-bold transition-colors ${deliveryType === 'inside_mymensingh' ? 'text-[#1a4731]' : 'text-slate-700'}`}>Inside Mymensingh</h4>
                              <span className="px-2 py-0.5 bg-[#1a4731]/10 text-[#1a4731] text-[9px] font-bold rounded uppercase">Local</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">Delivery Charge: <span className="font-extrabold text-slate-800">৳60</span></p>
                          </div>
                        </div>
                      </div>

                      <div 
                        className={`rounded-2xl border-2 p-5 transition-all duration-300 ${deliveryType === 'outside_mymensingh' ? 'border-[#1a4731] bg-[#f0fdf4]/30 shadow-sm shadow-[#1a4731]/10' : 'border-slate-100 bg-slate-50/50 opacity-40 pointer-events-none'}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${deliveryType === 'outside_mymensingh' ? 'border-[#1a4731]' : 'border-slate-300'}`}>
                            {deliveryType === 'outside_mymensingh' && <div className="w-2.5 h-2.5 rounded-full bg-[#1a4731]" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 justify-between">
                              <h4 className={`font-bold transition-colors ${deliveryType === 'outside_mymensingh' ? 'text-[#1a4731]' : 'text-slate-700'}`}>Outside Mymensingh</h4>
                              <span className="px-2 py-0.5 bg-[#1a4731]/10 text-[#1a4731] text-[9px] font-bold rounded uppercase">Courier</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">Delivery Charge: <span className="font-extrabold text-slate-800">৳120</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Section (Cash on Delivery Redesign) */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1a4731]" />
                <h2 className="text-xl font-display font-bold mb-6 flex items-center text-slate-800">
                  <span className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#1a4731] flex items-center justify-center mr-3 text-sm font-bold">
                    {deliveryMethod === 'online' ? '4' : '3'}
                  </span>
                  Payment Method
                </h2>

                <div className="relative overflow-hidden rounded-2xl border-2 border-[#1a4731]/20 bg-[#f0fdf4]/10 p-6 md:p-8 transition-all duration-300">
                  <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-[#1a4731]/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1a4731]/10 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#1a4731]/15 text-[#1a4731] flex items-center justify-center shrink-0 shadow-inner">
                        <Banknote className="w-6 h-6 text-[#1a4731] animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-800">{deliveryMethod === 'online' ? 'Cash on Delivery (COD)' : 'Pay on Pickup'}</h4>
                        <p className="text-xs text-[#1a4731] font-semibold flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Fully Enabled & Zero Risk
                        </p>
                      </div>
                    </div>
                    <span className="px-3.5 py-1.5 bg-[#1a4731] text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Standard
                    </span>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-xs font-bold text-slate-650 uppercase tracking-wider">How it works:</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-white/70 rounded-xl border border-slate-100/80 flex flex-col gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#1a4731]/10 text-[#1a4731] flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Submit Order</p>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Place order without making any online payments today.</p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white/70 rounded-xl border border-slate-100/80 flex flex-col gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#1a4731]/10 text-[#1a4731] flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">{deliveryMethod === 'online' ? 'Home Delivery' : 'Order Processing'}</p>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {deliveryMethod === 'online' 
                              ? 'Our courier partner delivers the items directly to your address.' 
                              : 'We will prepare and package your items ready for collection at our studio.'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white/70 rounded-xl border border-slate-100/80 flex flex-col gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#1a4731]/10 text-[#1a4731] flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">{deliveryMethod === 'online' ? 'Verify & Pay' : 'Collect & Pay'}</p>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {deliveryMethod === 'online' 
                              ? 'Inspect your package and hand over the cash to the rider.' 
                              : 'Visit our studio, verify your products, and make the payment.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center gap-2.5 text-[11px] text-slate-600 leading-relaxed bg-white/50 border border-[#1a4731]/5 px-4 py-3 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pay with full confidence. Absolutely no upfront card, bank, or mobile wallet details required.</span>
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* Right Side: Order Summary */}
          <div className="w-full lg:w-5/12">
            <div className="bg-white rounded-3xl shadow-xl shadow-[#1a4731]/5 border border-slate-100 p-6 md:p-8 lg:sticky lg:top-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#f0fdf4] rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
              
              <h2 className="text-xl font-display font-bold mb-6 flex items-center text-slate-800 relative z-10">
                <ShoppingCart className="w-5 h-5 mr-2 text-[#1a4731]" />
                Order Summary
              </h2>
              
              <div className="space-y-4 mb-6 custom-scrollbar max-h-[40vh] overflow-y-auto pr-2 relative z-10">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4 border-b border-slate-50 last:border-0 group">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 relative shrink-0 border border-slate-100">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                          <ShoppingCart className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">{item.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Qty: {item.quantity}</p>
                        <div className="text-sm font-bold text-[#1a4731]">
                          ৳ {(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4 relative z-10">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">৳ {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-slate-800">{deliveryMethod === 'office' ? '৳ 0 (Office Pickup)' : deliveryType ? `৳ ${deliveryCharge}` : '—'}</span>
                </div>
                <div className="flex justify-between text-xl font-display font-black text-[#1a4731] pt-4 border-t border-slate-100 mt-2">
                  <span>Total</span>
                  <span>৳ {total.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-8 relative z-10">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading || (deliveryMethod === 'online' && !deliveryType)}
                  className="w-full bg-[#1a4731] hover:bg-[#14402a] text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-[#1a4731]/20 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      Confirm Order {deliveryMethod === 'office' ? '(Pay on Pickup)' : '(Cash on Delivery)'}
                    </>
                  )}
                </button>
                
                <div className="mt-5 flex items-center justify-center text-[10px] uppercase tracking-widest font-bold text-slate-400 gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Secure Checkout Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
