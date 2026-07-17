import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    // 0. Clean Existing Data to allow re-seeding without constraint conflicts
    // Delete in order of dependency to respect foreign keys
    await prisma.activityLog.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.serviceRequest.deleteMany({});
    await prisma.bookingRoom.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.room.deleteMany({});
    await prisma.roomCategoryAmenity.deleteMany({});
    await prisma.roomCategory.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.hotel.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.user.deleteMany({});

    // 1. Seed Roles
    const rolesData = [
      { id: 1, name: 'SUPER_ADMIN' },
      { id: 2, name: 'RECEPTIONIST' },
      { id: 3, name: 'CUSTOMER' },
    ];

    for (const role of rolesData) {
      await prisma.role.upsert({
        where: { id: role.id },
        update: { name: role.name },
        create: { id: role.id, name: role.name },
      });
    }

    // 2. Seed Amenities
    const amenitiesData = [
      { name: 'Free High-Speed WiFi', icon: 'Wifi', description: 'Complementary high-speed internet' },
      { name: 'Air Conditioning', icon: 'Wind', description: 'Individually controlled climate' },
      { name: 'Smart Flat TV', icon: 'Tv', description: '4K TV with international channels' },
      { name: 'Fully Stocked Mini Bar', icon: 'Coffee', description: 'Snacks, sodas, and premium beverages' },
      { name: 'Private Balcony', icon: 'Compass', description: 'Scenic outdoor sitting area' },
      { name: '24/7 Room Service', icon: 'Bell', description: 'In-room dining and cleaning' },
      { name: 'Luxury Bath Amenities', icon: 'Sparkles', description: 'Organic soaps, shampoos, and soft towels' },
      { name: 'Safe Deposit Box', icon: 'Shield', description: 'Electronic safe for your valuables' },
    ];

    const amenitiesMap: Record<string, string> = {};
    for (const item of amenitiesData) {
      const amenity = await prisma.amenity.upsert({
        where: { name: item.name },
        update: { icon: item.icon, description: item.description },
        create: { name: item.name, icon: item.icon, description: item.description },
      });
      amenitiesMap[item.name] = amenity.id;
    }

    // 3. Define hotels list across major Indian destinations
    const hotelsList = [
      {
        name: 'Grand Palace Resort & Spa',
        description: 'Experience absolute luxury in our world-class resort. Nestled in a prime oceanfront location, Grand Palace Resort & Spa offers high-end spa therapies, gourmet dining experiences, a heated infinity pool, and custom-designed suites with panoramic views of the coast. Ideal for family vacations, romantic getaways, and luxury corporate events.',
        address: '101, Marine Drive, Netaji Subhash Chandra Bose Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        email: 'contact@grandpalaceresort.com',
        phone: '+91 22 2282 1234',
        images: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
        rating: 4.8,
        categories: [
          {
            name: 'Standard Queen Room',
            description: 'Charming and cozy room designed for comfort. Includes a comfortable queen-size plush bed, small workstation, and beautiful city-side view windows.',
            pricePerNight: 3500.0,
            maxGuests: 2,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Safe Deposit Box'],
          },
          {
            name: 'Deluxe Suite',
            description: 'Spacious high-end suite with a separate seating lounge, king-size orthopedic bed, luxury bath, and ocean views. Features modern minimalist decor and premium amenities.',
            pricePerNight: 7500.0,
            maxGuests: 3,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities'],
          },
          {
            name: 'Presidential Penthouse',
            description: 'The pinnacle of luxury living. Occupying the entire top floor, the Penthouse features a private jacuzzi, full kitchen, dining room, custom king beds, and 360-degree panoramic ocean views.',
            pricePerNight: 18000.0,
            maxGuests: 4,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities', 'Safe Deposit Box'],
          },
        ]
      },
      {
        name: 'The Heritage Palace',
        description: 'Immerse yourself in the royal grandeur of Rajasthan. A meticulously restored 19th-century palace, offering authentic heritage suites, traditional puppet shows, royal dining halls serving Rajasthani cuisine, and private courtyard pools.',
        address: '12, Janpath, Scheme Area',
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        email: 'stay@heritagepalace.com',
        phone: '+91 141 456 7890',
        images: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
        rating: 4.9,
        categories: [
          {
            name: 'Heritage Deluxe Room',
            description: 'Elegantly furnished with traditional Rajasthani decor, featuring a poster bed, antique fixtures, and handcrafted linens.',
            pricePerNight: 4500.0,
            maxGuests: 2,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Safe Deposit Box'],
          },
          {
            name: 'Royal Suite',
            description: 'Large suite featuring a separate living room, traditional jharokha balcony views, marble flooring, and access to the central royal courtyard.',
            pricePerNight: 9000.0,
            maxGuests: 3,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities'],
          },
          {
            name: 'Maharaja Suite',
            description: 'The royal crown jewel. Rich gold accents, private indoor pool, dining area for six, 24/7 personal butler service, and antique furniture belonging to royal descendants.',
            pricePerNight: 22000.0,
            maxGuests: 4,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities', 'Safe Deposit Box'],
          },
        ]
      },
      {
        name: 'The Himalayan Retreat',
        description: 'Escape to the serene, snow-capped heights of the Himalayas. Surrounded by pine forests and overlooking majestic peaks, this luxury cottage retreat offers heated rooms, fireside dining, guided trekking, and panoramic mountain views.',
        address: 'Forest Hill Road, Near Mall Road',
        city: 'Shimla',
        state: 'Himachal Pradesh',
        country: 'India',
        email: 'info@himalayanretreat.com',
        phone: '+91 177 265 4321',
        images: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
        rating: 4.7,
        categories: [
          {
            name: 'Cozy Mountain Room',
            description: 'Warm pinewood interiors with a heating system, comfortable double bed, and panoramic windows showing snow peaks.',
            pricePerNight: 3800.0,
            maxGuests: 2,
            hasAC: false,
            images: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Smart Flat TV', 'Safe Deposit Box'],
          },
          {
            name: 'Forest View Suite',
            description: 'Spacious cottage suite featuring a private brick fireplace, lounge chairs, and a private wooden balcony over forest valleys.',
            pricePerNight: 6500.0,
            maxGuests: 3,
            hasAC: false,
            images: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities'],
          },
          {
            name: 'Himalayan Penthouse',
            description: 'A duplex penthouse with high cathedral ceilings, skylights for stargazing, an expansive living room with double fireplace, and butler service.',
            pricePerNight: 14000.0,
            maxGuests: 4,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities', 'Safe Deposit Box'],
          },
        ]
      },
      {
        name: 'Goa Beachfront Palms Resort',
        description: 'Soak in the sun at our premier beachfront resort. Located steps from the soft sands of Calangute, the resort features private beach shacks, a swim-up bar, water sports facilities, and suites with spectacular sunset views.',
        address: 'Beach Road, Calangute',
        city: 'Calangute',
        state: 'Goa',
        country: 'India',
        email: 'goa@palmsresort.com',
        phone: '+91 832 278 9012',
        images: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
        rating: 4.6,
        categories: [
          {
            name: 'Garden Villa Room',
            description: 'Cozy villa situated in tropical gardens. Features a hammock, outdoor sitout area, and steps to the main pool.',
            pricePerNight: 4200.0,
            maxGuests: 2,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Safe Deposit Box'],
          },
          {
            name: 'Beachfront Suite',
            description: 'Step directly from your room onto the sand. Incredible sea facing views, sliding glass doors, and complimentary sunset cocktails.',
            pricePerNight: 8000.0,
            maxGuests: 3,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities'],
          },
          {
            name: 'Private Pool Villa',
            description: 'A private sanctuary with its own personal plunge pool, open-sky bathroom, direct path to the resort beach, and private chef services.',
            pricePerNight: 16000.0,
            maxGuests: 4,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities', 'Safe Deposit Box'],
          },
        ]
      },
      {
        name: 'The Silicon Valley Grand',
        description: 'Modern luxury meets tech-friendly convenience. Situated in the heart of Indias tech hub, this hotel is designed for business travelers and luxury seekers alike, featuring automated rooms, a rooftop infinity pool, and a high-end business center.',
        address: '45, Richmond Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        email: 'reservations@siliconvalleygrand.com',
        phone: '+91 80 4912 3456',
        images: 'https://images.unsplash.com/photo-1590073844006-33379778ae09?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80',
        rating: 4.5,
        categories: [
          {
            name: 'Executive Tech Room',
            description: 'Smart features controlled by tablet. High speed ethernet, ergonomic desk setup, and views of the city skyline.',
            pricePerNight: 4000.0,
            maxGuests: 2,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1606046604972-77cc76aee944?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Safe Deposit Box'],
          },
          {
            name: 'Club Lounge Suite',
            description: 'Includes premium access to the Executive Club Lounge, boardroom access, premium high floors, and luxury business services.',
            pricePerNight: 7000.0,
            maxGuests: 3,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1611891487122-2075b96244e1?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities'],
          },
          {
            name: 'Presidential Suite',
            description: 'The peak of corporate luxury. Double master bedrooms, dining room, private conference room, fully automated settings, and airport limo pickup.',
            pricePerNight: 15000.0,
            maxGuests: 4,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities', 'Safe Deposit Box'],
          },
        ]
      },
      {
        name: 'The Backwater Serenade Resort',
        description: 'Experience the peaceful bliss of Keralas backwaters. Built in traditional Kerala architecture, this eco-luxury resort offers traditional Ayurvedic treatments, houseboat dining, and private villas overlooking the calm Vembanad Lake.',
        address: 'Vembanad Lake Side, Kumarakom',
        city: 'Kochi',
        state: 'Kerala',
        country: 'India',
        email: 'kerala@backwaterserenade.com',
        phone: '+91 484 256 7890',
        images: 'https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
        rating: 4.9,
        categories: [
          {
            name: 'Lakeview Cottage',
            description: 'Thatched cottages facing the lake, offering traditional outdoor wooden loungers and private verandas.',
            pricePerNight: 5000.0,
            maxGuests: 2,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Safe Deposit Box'],
          },
          {
            name: 'Ayurvedic Suite',
            description: 'Specially designed wellness suite. Includes custom herbal tea station, yoga mats, organic cotton linens, and daily Ayurvedic body therapies.',
            pricePerNight: 8500.0,
            maxGuests: 3,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities'],
          },
          {
            name: 'Kerala Pool Villa',
            description: 'Featuring a private traditional heritage courtyard, private open-air infinity pool, outdoor brass bathtub, and direct private jetty access.',
            pricePerNight: 18000.0,
            maxGuests: 4,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities', 'Safe Deposit Box'],
          },
        ]
      },
      {
        name: 'The Imperial Capital',
        description: 'Experience colonial charm and contemporary sophistication. Located in Lutyens Delhi, this landmark hotel offers neoclassical design, award-winning fine dining restaurants, landscaped gardens, and premium suites.',
        address: '1, Janpath Road, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        email: 'imperial@capitalhotels.in',
        phone: '+91 11 4321 0987',
        images: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80,https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1200&q=80',
        rating: 4.8,
        categories: [
          {
            name: 'Heritage Classic Room',
            description: 'Impeccable neoclassical design, high ceilings, Italian marble bath, and elegant furnishings inspired by historical architecture.',
            pricePerNight: 5000.0,
            maxGuests: 2,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Safe Deposit Box'],
          },
          {
            name: 'Imperial Executive Suite',
            description: 'Plush mahogany furnishings, separate library corner, personalized stationeries, walk-in closets, and view of the central garden lawns.',
            pricePerNight: 9500.0,
            maxGuests: 3,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities'],
          },
          {
            name: 'Presidential Suite',
            description: 'Spanning over 2500 sq ft, this regal suite offers bulletproof glass windows, fully secure zones, a grand dining salon, gym, sauna, and premium vintage decors.',
            pricePerNight: 22000.0,
            maxGuests: 4,
            hasAC: true,
            images: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80',
            amenities: ['Free High-Speed WiFi', 'Air Conditioning', 'Smart Flat TV', 'Fully Stocked Mini Bar', 'Private Balcony', '24/7 Room Service', 'Luxury Bath Amenities', 'Safe Deposit Box'],
          },
        ]
      }
    ];

    let firstHotelId = '';

    // 4. Seed Hotels & Room Categories & Rooms
    for (const hotelData of hotelsList) {
      const hotel = await prisma.hotel.create({
        data: {
          name: hotelData.name,
          description: hotelData.description,
          address: hotelData.address,
          city: hotelData.city,
          state: hotelData.state,
          country: hotelData.country,
          email: hotelData.email,
          phone: hotelData.phone,
          images: hotelData.images,
          status: 'ACTIVE',
          rating: hotelData.rating,
        },
      });

      if (!firstHotelId) {
        firstHotelId = hotel.id;
      }

      for (let i = 0; i < hotelData.categories.length; i++) {
        const cat = hotelData.categories[i];
        const dbCategory = await prisma.roomCategory.create({
          data: {
            hotelId: hotel.id,
            name: cat.name,
            description: cat.description,
            pricePerNight: cat.pricePerNight,
            maxGuests: cat.maxGuests,
            hasAC: cat.hasAC,
            images: cat.images,
          },
        });

        // Link amenities to categories
        for (const amenityName of cat.amenities) {
          const amenityId = amenitiesMap[amenityName];
          if (amenityId) {
            await prisma.roomCategoryAmenity.create({
              data: {
                categoryId: dbCategory.id,
                amenityId: amenityId,
              },
            });
          }
        }

        // Seed 2 Rooms per category with clean naming/numbering
        const prefix = String(i + 1);

        await prisma.room.create({
          data: {
            hotelId: hotel.id,
            categoryId: dbCategory.id,
            roomNumber: `${prefix}01`,
            status: 'Available',
            cleaningStatus: 'Clean',
          },
        });

        await prisma.room.create({
          data: {
            hotelId: hotel.id,
            categoryId: dbCategory.id,
            roomNumber: `${prefix}02`,
            status: 'Available',
            cleaningStatus: 'Clean',
          },
        });
      }
    }

    // 5. Seed Taxes
    const taxesData = [
      { name: 'CGST 9%', rate: 9.0, isActive: true },
      { name: 'SGST 9%', rate: 9.0, isActive: true },
      { name: 'Service Luxury Tax 2%', rate: 2.0, isActive: true },
    ];

    for (const tax of taxesData) {
      await prisma.tax.upsert({
        where: { name: tax.name },
        update: { rate: tax.rate, isActive: tax.isActive },
        create: { name: tax.name, rate: tax.rate, isActive: tax.isActive },
      });
    }

    // 6. Seed Coupons
    const couponsData = [
      {
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10.0,
        minBookingAmount: 3000.0,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-12-31'),
        isActive: true,
        maxUses: 1000,
        usesCount: 0,
      },
      {
        code: 'LUXURY500',
        discountType: 'FLAT',
        discountValue: 500.0,
        minBookingAmount: 5000.0,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-12-31'),
        isActive: true,
        maxUses: 500,
        usesCount: 0,
      },
    ];

    for (const coupon of couponsData) {
      await prisma.coupon.upsert({
        where: { code: coupon.code },
        update: {
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minBookingAmount: coupon.minBookingAmount,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          isActive: coupon.isActive,
        },
        create: coupon,
      });
    }

    // 7. Seed Default Users
    // A. Super Admin User
    const adminPassHash = await hashPassword('Password123');
    await prisma.user.upsert({
      where: { email: 'admin@hotel.com' },
      update: { passwordHash: adminPassHash, name: 'Main Super Admin', status: 'ACTIVE' },
      create: {
        email: 'admin@hotel.com',
        passwordHash: adminPassHash,
        name: 'Main Super Admin',
        phone: '+91 9999999999',
        roleId: 1, // SUPER_ADMIN
        status: 'ACTIVE',
      },
    });

    // B. Receptionist User & Employee Record
    const receptionistPassHash = await hashPassword('Password123');
    const receptionUser = await prisma.user.upsert({
      where: { email: 'receptionist@hotel.com' },
      update: { passwordHash: receptionistPassHash, name: 'Anjali Sharma', status: 'ACTIVE' },
      create: {
        email: 'receptionist@hotel.com',
        passwordHash: receptionistPassHash,
        name: 'Anjali Sharma',
        phone: '+91 8888888888',
        roleId: 2, // RECEPTIONIST
        status: 'ACTIVE',
      },
    });

    await prisma.employee.upsert({
      where: { userId: receptionUser.id },
      update: { hotelId: firstHotelId, designation: 'RECEPTIONIST' },
      create: {
        userId: receptionUser.id,
        hotelId: firstHotelId,
        designation: 'RECEPTIONIST',
        salary: 25000.0,
        dateOfJoining: new Date(),
      },
    });

    // C. Customer User & Customer Record
    const customerPassHash = await hashPassword('Password123');
    const customerUser = await prisma.user.upsert({
      where: { email: 'customer@hotel.com' },
      update: { passwordHash: customerPassHash, name: 'Rohan Gupta', status: 'ACTIVE' },
      create: {
        email: 'customer@hotel.com',
        passwordHash: customerPassHash,
        name: 'Rohan Gupta',
        phone: '+91 7777777777',
        roleId: 3, // CUSTOMER
        status: 'ACTIVE',
      },
    });

    await prisma.customer.upsert({
      where: { userId: customerUser.id },
      update: { name: 'Rohan Gupta', email: 'customer@hotel.com', phone: '+91 7777777777' },
      create: {
        userId: customerUser.id,
        name: 'Rohan Gupta',
        email: 'customer@hotel.com',
        phone: '+91 7777777777',
        address: 'Flat 402, Shiv Towers, Bandra West, Mumbai',
        documentType: 'Aadhaar',
        documentNumber: '1234-5678-9012',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
    });
  } catch (error: any) {
    console.error('Seeding database error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Database seeding failed',
        error: error.message || error,
      },
      { status: 500 }
    );
  }
}
