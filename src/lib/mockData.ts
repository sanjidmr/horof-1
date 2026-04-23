import { Product, Category, Order, Customer } from './types';
import Image from "next/image";


export const categories: Category[] = [
  {
    id: '1',
    name: 'Wood Furniture',
    slug: 'wood-furniture',
    image: '/images/c2.jpg',
    productCount: 45
  },
  {
    id: '2',
    name: 'Art Supplies',
    slug: 'art-supplies',
    image: '/images/c3.jpg',
    productCount: 120
  },
  {
    id: '3',
    name: 'Home Decor',
    slug: 'home-decor',
    image: '/images/c1.jpg',
    productCount: 85
  },
  {
    id: '4',
    name: 'Handicrafts',
    slug: 'handicrafts',
    image: '/images/c4.jpg',
    productCount: 32
  },
  {
    id: '5',
    name: 'Wall Art',
    slug: 'wall-art',
    image: '/images/c5.jpg',
    productCount: 56
  }
];

export const products: Product[] = [
  {
    id: 'p1',
    name: 'Hand-Carved Walnut Dining Table',
    description: 'A masterpiece of craftsmanship, this dining table is carved from a single piece of premium walnut wood, preserving its natural grain and beauty.',
    price: 145000,
    discountPrice: 125000,
    images: [
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Wood Furniture',
    rating: 4.9,
    reviewCount: 24,
    stock: 5,
    tags: ['luxury', 'handmade', 'walnut'],
    isFeatured: true
  },
  {
    id: 'p2',
    name: 'Professional Charcoal Sketch Set',
    description: 'Complete set for artists, including various grades of charcoal, blending stumps, and a premium eraser. Perfect for detailed portraits.',
    price: 5200,
    images: [
      'https://images.unsplash.com/photo-1544273677-c433136021d4?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Art Supplies',
    rating: 4.8,
    reviewCount: 156,
    stock: 50,
    tags: ['art', 'sketching', 'set'],
    isNew: true
  },
  {
    id: 'p3',
    name: 'Teak Wood Wall Mirror',
    description: 'Enhance your room with this elegant teak wood wall mirror. The frame features intricate carvings inspired by traditional forest patterns.',
    price: 21500,
    discountPrice: 18500,
    images: [
      'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1583847268964-b28dc2f51ac9?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1591123120675-6f7f1aae0e5b?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'Home Decor',
    rating: 4.7,
    reviewCount: 42,
    stock: 12,
    tags: ['mirror', 'teak', 'wall art'],
    isFeatured: true
  },
  {
    id: 'p4',
    name: 'Handcrafted Oak Sculpture',
    description: 'A unique abstract sculpture representing the flow of nature, hand-polished to a smooth finish that highlights the oak grain.',
    price: 45000,
    images: ['https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=800'],
    category: 'Handicrafts',
    rating: 5.0,
    reviewCount: 18,
    stock: 3,
    tags: ['sculpture', 'oak', 'unique'],
    isFeatured: true
  },
  {
    id: 'p5',
    name: 'Premium Watercolor Paper Pad',
    description: '300gsm cold-pressed watercolor paper, 20 sheets. Acids-free and durable for heavy washes.',
    price: 3200,
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800'],
    category: 'Art Supplies',
    rating: 4.9,
    reviewCount: 89,
    stock: 100,
    tags: ['paper', 'watercolor', 'supplies']
  },
  {
    id: 'p6',
    name: 'Cherry Wood Desk Organizer',
    description: 'Keep your workspace tidy with this stylish cherry wood organizer. Features slots for pens, phone, and letters.',
    price: 7500,
    images: ['https://images.unsplash.com/photo-1591123120675-6f7f1aae0e5b?auto=format&fit=crop&q=80&w=800'],
    category: 'Home Decor',
    rating: 4.6,
    reviewCount: 67,
    stock: 25,
    tags: ['desk', 'organizer', 'cherry']
  },
  {
    id: 'p7',
    name: 'Bamboo Artist Brushes Set',
    description: 'Set of 12 brushes with bamboo handles and synthetic bristles for smooth application of oils and acrylics.',
    price: 4500,
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800'],
    category: 'Art Supplies',
    rating: 4.5,
    reviewCount: 45,
    stock: 40,
    tags: ['brushes', 'set', 'painting']
  },
  {
    id: 'p8',
    name: 'Rustic Pine Bookshelf',
    description: 'Solid pine bookshelf with a rustic finish. Durable and perfect for displaying your favorite collection.',
    price: 55000,
    images: ['https://images.unsplash.com/photo-1594620302200-9a762244a156?auto=format&fit=crop&q=80&w=800'],
    category: 'Wood Furniture',
    rating: 4.7,
    reviewCount: 31,
    stock: 8,
    tags: ['furniture', 'pine', 'bookshelf']
  },
  {
    id: 'p9',
    name: 'Minimalist Ash Wood Stool',
    description: 'Clean lines and sturdy construction make this ash wood stool a versatile addition to any home.',
    price: 15000,
    images: ['https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&q=80&w=800'],
    category: 'Wood Furniture',
    rating: 4.8,
    reviewCount: 54,
    stock: 15,
    tags: ['minimalist', 'ash', 'furniture']
  },
  {
    id: 'p10',
    name: 'Acrylic Paint Set - Tropical Colors',
    description: '24 vibrant tropical shades in large 60ml tubes. High pigment density and lightfastness.',
    price: 6500,
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800'],
    category: 'Art Supplies',
    rating: 4.9,
    reviewCount: 112,
    stock: 60,
    tags: ['acrylic', 'paint', 'colors']
  },
  {
    id: 'p11',
    name: 'Reclaimed Barnwood Coffee Table',
    description: 'Each table is unique, made from century-old reclaimed barnwood with a rich history and beautiful natural weathering.',
    price: 42000,
    discountPrice: 35000,
    images: ['https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=800'],
    category: 'Wood Furniture',
    rating: 4.8,
    reviewCount: 34,
    stock: 7,
    tags: ['reclaimed', 'coffee table', 'furniture'],
    isNew: true
  },
  {
    id: 'p12',
    name: 'Oil Painting Master Set',
    description: 'Professional grade oil paints with high pigment concentration. Includes 24 tubes, palette, and cleaning spirit.',
    price: 15500,
    discountPrice: 12500,
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800'],
    category: 'Art Supplies',
    rating: 4.9,
    reviewCount: 56,
    stock: 20,
    tags: ['oil paint', 'master set', 'art'],
    isFeatured: true
  },
  {
    id: 'p13',
    name: 'Geometric Wood Wall Art Panel',
    description: 'Modern geometric design created using different shades of wood. A stunning focal point for any contemporary living room.',
    price: 9500,
    discountPrice: 8500,
    images: ['https://images.unsplash.com/photo-1561070791-230f18ef4407?auto=format&fit=crop&q=80&w=800'],
    category: 'Wall Art',
    rating: 4.7,
    reviewCount: 28,
    stock: 15,
    tags: ['geometric', 'wall art', 'modern'],
    isFeatured: true
  },
  {
    id: 'p14',
    name: 'Zen Garden Miniature Sand Tray',
    description: 'Bring tranquility to your desk with this handmade wooden sand tray, including miniature rakes and smooth stones.',
    price: 4800,
    discountPrice: 4200,
    images: ['https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800'],
    category: 'Home Decor',
    rating: 4.6,
    reviewCount: 41,
    stock: 30,
    tags: ['zen', 'sand tray', 'office decor']
  },
  {
    id: 'p15',
    name: 'Hand-Forged Wood Chisel Set',
    description: 'Set of 6 high-carbon steel chisels with ergonomic ash wood handles. Designed for professional woodcarving and joinery.',
    price: 11500,
    discountPrice: 9800,
    images: ['https://images.unsplash.com/photo-1530124560676-587cab91df31?auto=format&fit=crop&q=80&w=800'],
    category: 'Art Supplies',
    rating: 5.0,
    reviewCount: 15,
    stock: 12,
    tags: ['tools', 'chisels', 'woodworking'],
    isNew: true
  },
  {
    id: 'p16',
    name: 'Mahogany Jewelry Box with Secret Compartment',
    description: 'Exquisite mahogany box with silk lining and a hidden spring-loaded compartment for your most precious items.',
    price: 18500,
    discountPrice: 15500,
    images: ['https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=800'],
    category: 'Handicrafts',
    rating: 4.9,
    reviewCount: 22,
    stock: 5,
    tags: ['jewelry box', 'mahogany', 'handicraft'],
    isFeatured: true
  },
  {
    id: 'p17',
    name: 'Cedar Wood Essential Oil Diffuser',
    description: 'Hand-turned cedar wood shell housing a high-tech ultrasonic diffuser. Aromatherapy meets natural beauty.',
    price: 6800,
    discountPrice: 5800,
    images: ['https://images.unsplash.com/photo-1616137422495-1e902b721149?auto=format&fit=crop&q=80&w=800'],
    category: 'Home Decor',
    rating: 4.5,
    reviewCount: 73,
    stock: 40,
    tags: ['diffuser', 'cedar', 'aromatherapy']
  },
  {
    id: 'p18',
    name: 'Floating Solid Oak Shelves',
    description: 'Transform your walls with these invisible-bracket floating shelves made from thick, solid oak planks.',
    price: 14000,
    discountPrice: 12000,
    images: ['https://images.unsplash.com/photo-1594620302200-9a762244a156?auto=format&fit=crop&q=80&w=800'],
    category: 'Home Decor',
    rating: 4.8,
    reviewCount: 94,
    stock: 18,
    tags: ['shelves', 'oak', 'storage']
  },
  {
    id: 'p19',
    name: 'Hand-Painted Wooden Mask',
    description: 'Traditional folk art mask, hand-painted with natural pigments on seasoned Jackwood. A unique piece of heritage.',
    price: 8500,
    discountPrice: 7500,
    images: ['https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=800'],
    category: 'Wall Art',
    rating: 4.7,
    reviewCount: 19,
    stock: 6,
    tags: ['mask', 'folk art', 'wall art']
  },
  {
    id: 'p20',
    name: 'Vintage Style Wooden Easel',
    description: 'Professional H-frame easel made from solid beech wood. Fully adjustable for canvases up to 1.5 meters.',
    price: 13500,
    discountPrice: 11000,
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800'],
    category: 'Art Supplies',
    rating: 4.9,
    reviewCount: 47,
    stock: 10,
    tags: ['easel', 'art studio', 'beech wood'],
    isNew: true
  },
  {
    id: 'p21',
    name: 'Hand-Turned Ebony Deep Bowl',
    description: 'Expertly turned from rare ebony wood, this deep bowl features a natural satin finish that highlights the dark, dense grain characteristic of exotic timber.',
    price: 19500,
    discountPrice: 16500,
    images: ['https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=800'],
    category: 'Handicrafts',
    rating: 5.0,
    reviewCount: 12,
    stock: 4,
    tags: ['ebony', 'bowl', 'hand-turned'],
    isFeatured: true
  },
  {
    id: 'p22',
    name: 'Ancient Banyan Root Sculpture',
    description: 'A natural masterpiece. This sculpture is made from a preserved ancient banyan root, ethically sourced and cleaned to reveal its intricate, flowing form.',
    price: 85000,
    images: ['https://images.unsplash.com/photo-1544413647-ad3489815041?auto=format&fit=crop&q=80&w=800'],
    category: 'Sculptures',
    rating: 4.9,
    reviewCount: 7,
    stock: 2,
    tags: ['banyan', 'root', 'ancient', 'sculpture'],
    isFeatured: true
  },
  {
    id: 'p23',
    name: 'Artisan Piling Minimalist Bench',
    description: 'A fusion of industrial piling timber and clean minimalist design. This bench brings raw, powerful character to any entryway or master bedroom.',
    price: 58000,
    discountPrice: 48000,
    images: ['https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&q=80&w=800'],
    category: 'Wood Furniture',
    rating: 4.8,
    reviewCount: 15,
    stock: 3,
    tags: ['bench', 'minimalist', 'artisan'],
    isFeatured: true
  },
  {
    id: 'p24',
    name: 'Hand-Carved Rosewood Chess Set',
    description: 'Each piece in this royal chess set is meticulously hand-carved from seasoned rosewood and boxwood. Features a weighted base and intricate detailing.',
    price: 24500,
    images: ['https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=800'],
    category: 'Handicrafts',
    rating: 5.0,
    reviewCount: 31,
    stock: 8,
    tags: ['chess', 'rosewood', 'hand-carved'],
    isNew: true
  }
];

export const orders: Order[] = [
  {
    id: 'ORD-1001',
    customerName: 'Sanjid Ahmed',
    email: 'sanjid@example.com',
    phone: '01712345678',
    address: 'House 12, Road 4, Sector 7, Uttara, Dhaka',
    items: [
      { ...products[0], quantity: 1 }
    ],
    total: 125000,
    status: 'processing',
    paymentMethod: 'bkash',
    transactionId: 'BK12345678',
    date: '2026-04-15'
  },
  {
    id: 'ORD-1002',
    customerName: 'Rahat Kabir',
    email: 'rahat@example.com',
    phone: '01812345678',
    address: 'Plot 5, GEC Circle, Chittagong',
    items: [
      { ...products[1], quantity: 2 },
      { ...products[4], quantity: 1 }
    ],
    total: 13600,
    status: 'delivered',
    paymentMethod: 'cod',
    date: '2026-04-10'
  }
];

export const customers: Customer[] = [
  {
    id: 'c1',
    name: 'Sanjid Ahmed',
    email: 'sanjid@example.com',
    phone: '01712345678',
    joinedDate: '2025-01-20',
    orders: 3,
    totalSpent: 175000
  },
  {
    id: 'c2',
    name: 'Afifa Karim',
    email: 'afifa@example.com',
    phone: '01912345678',
    joinedDate: '2025-03-12',
    orders: 1,
    totalSpent: 5200
  }
];
