const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Import models
const User = require('../models/User');
const Order = require('../models/Order');

// Sample users data
const sampleUsers = [
    {
        name: 'Ahmed Hassan',
        email: 'ahmed.hassan@email.com',
        phone: '+201234567890',
        address: {
            street: '123 Tahrir Square',
            city: 'Cairo',
            state: 'Cairo',
            zipCode: '11511',
            country: 'Egypt'
        }
    },
    {
        name: 'Fatma Ali',
        email: 'fatma.ali@email.com',
        phone: '+209876543210',
        address: {
            street: '45 Corniche Road',
            city: 'Alexandria',
            state: 'Alexandria',
            zipCode: '21500',
            country: 'Egypt'
        }
    },
    {
        name: 'Mohamed Ibrahim',
        email: 'mohamed.ibrahim@email.com',
        phone: '+205551234567',
        address: {
            street: '78 Pyramids Road',
            city: 'Giza',
            state: 'Giza',
            zipCode: '12511',
            country: 'Egypt'
        }
    },
    {
        name: 'Nour El-Din',
        email: 'nour.eldin@email.com',
        phone: '+204447890123',
        address: {
            street: '12 Nile Street',
            city: 'Luxor',
            state: 'Luxor',
            zipCode: '85951',
            country: 'Egypt'
        }
    },
    {
        name: 'Sara Mohamed',
        email: 'sara.mohamed@email.com',
        phone: '+203334567890',
        address: {
            street: '90 Nile Corniche',
            city: 'Aswan',
            state: 'Aswan',
            zipCode: '81511',
            country: 'Egypt'
        }
    }
];

// Sample orders data
const sampleOrders = [
    {
        customer: {
            name: 'Ahmed Hassan',
            email: 'ahmed.hassan@email.com',
            phone: '+201234567890'
        },
        shippingAddress: {
            street: '123 Tahrir Square, Downtown Cairo',
            city: 'Cairo',
            state: 'Cairo',
            zipCode: '11511',
            country: 'Egypt'
        },
        items: [
            {
                name: 'Gaming Laptop',
                description: 'High-performance gaming laptop with RTX 4070',
                quantity: 1,
                price: 1200.00,
                weight: 2.5
            },
            {
                name: 'Wireless Mouse',
                description: 'Gaming wireless mouse with RGB lighting',
                quantity: 1,
                price: 50.50,
                weight: 0.2
            }
        ],
        orderNumber: 'ORD-000001',
        shippingMethod: 'express',
        status: 'delivered',
        totalAmount: 1250.50,
        shippingCost: 25.00,
        tax: 0.00,
        notes: 'Handle with care - fragile items',
        estimatedDelivery: new Date('2024-01-20'),
        actualDelivery: new Date('2024-01-19'),
        platform: 'Website',
        callResult: 'Confirmed',
        agent: 'Alaa Hassan'
    },
    {
        customer: {
            name: 'Fatma Ali',
            email: 'fatma.ali@email.com',
            phone: '+209876543210'
        },
        shippingAddress: {
            street: '45 Corniche Road, Alexandria',
            city: 'Alexandria',
            state: 'Alexandria',
            zipCode: '21500',
            country: 'Egypt'
        },
        items: [
            {
                name: 'iPhone 15 Pro',
                description: 'Latest iPhone with Pro camera system',
                quantity: 1,
                price: 800.00,
                weight: 0.2
            },
            {
                name: 'Protective Case',
                description: 'Clear protective case for iPhone 15 Pro',
                quantity: 1,
                price: 50.75,
                weight: 0.1
            }
        ],
        orderNumber: 'ORD-000002',
        shippingMethod: 'standard',
        status: 'processing',
        totalAmount: 850.75,
        shippingCost: 15.00,
        tax: 0.00,
        notes: 'Customer requested morning delivery',
        estimatedDelivery: new Date('2024-01-25'),
        platform: 'Mobile App',
        callResult: 'Callback Requested',
        agent: 'Mona Youssef'
    },
    {
        customer: {
            name: 'Mohamed Ibrahim',
            email: 'mohamed.ibrahim@email.com',
            phone: '+205551234567'
        },
        shippingAddress: {
            street: '78 Pyramids Road, Giza',
            city: 'Giza',
            state: 'Giza',
            zipCode: '12511',
            country: 'Egypt'
        },
        items: [
            {
                name: 'Gaming Desktop PC',
                description: 'High-end gaming desktop with RTX 4070, 32GB RAM',
                quantity: 1,
                price: 2000.00,
                weight: 15.0
            }
        ],
        orderNumber: 'ORD-000003',
        shippingMethod: 'express',
        status: 'processing',
        totalAmount: 2100.00,
        shippingCost: 50.00,
        tax: 50.00,
        notes: 'Heavy item - special handling required',
        estimatedDelivery: new Date('2024-01-22'),
        platform: 'Website',
        callResult: 'No Answer',
        agent: 'Karim Nabil'
    },
    {
        customer: {
            name: 'Nour El-Din',
            email: 'nour.eldin@email.com',
            phone: '+204447890123'
        },
        shippingAddress: {
            street: '12 Nile Street, Luxor',
            city: 'Luxor',
            state: 'Luxor',
            zipCode: '85951',
            country: 'Egypt'
        },
        items: [
            {
                name: 'Educational Books',
                description: 'Set of programming and computer science books',
                quantity: 3,
                price: 120.00,
                weight: 1.5
            },
            {
                name: 'Notebooks',
                description: 'High-quality notebooks for programming notes',
                quantity: 5,
                price: 25.00,
                weight: 0.5
            },
            {
                name: 'Pens Set',
                description: 'Professional writing pens set',
                quantity: 2,
                price: 15.25,
                weight: 0.1
            }
        ],
        orderNumber: 'ORD-000004',
        shippingMethod: 'standard',
        status: 'pending',
        totalAmount: 450.25,
        shippingCost: 20.00,
        tax: 0.00,
        notes: 'Educational materials - priority shipping',
        estimatedDelivery: new Date('2024-01-28'),
        platform: 'Social Media',
        callResult: 'Wrong Number',
        agent: 'Sara Adel'
    },
    {
        customer: {
            name: 'Sara Mohamed',
            email: 'sara.mohamed@email.com',
            phone: '+203334567890'
        },
        shippingAddress: {
            street: '90 Nile Corniche, Aswan',
            city: 'Aswan',
            state: 'Aswan',
            zipCode: '81511',
            country: 'Egypt'
        },
        items: [
            {
                name: 'iPad Pro 12.9"',
                description: 'Latest iPad Pro with M2 chip',
                quantity: 1,
                price: 700.00,
                weight: 0.7
            },
            {
                name: 'Apple Pencil',
                description: 'Apple Pencil for iPad Pro',
                quantity: 1,
                price: 50.00,
                weight: 0.1
            }
        ],
        orderNumber: 'ORD-000005',
        shippingMethod: 'overnight',
        status: 'cancelled',
        totalAmount: 750.00,
        shippingCost: 30.00,
        tax: 0.00,
        notes: 'Customer cancelled - refund processed',
        estimatedDelivery: new Date('2024-01-18'),
        platform: 'Phone',
        callResult: 'Cancelled by Customer',
        agent: 'Omar Tarek'
    },
    {
        customer: {
            name: 'Omar Hassan',
            email: 'omar.hassan@email.com',
            phone: '+202227890123'
        },
        shippingAddress: {
            street: '15 Naama Bay, Sharm El-Sheikh',
            city: 'Sharm El-Sheikh',
            state: 'South Sinai',
            zipCode: '46619',
            country: 'Egypt'
        },
        items: [
            {
                name: 'Canon EOS R5 Camera',
                description: 'Professional mirrorless camera',
                quantity: 1,
                price: 2500.00,
                weight: 1.2
            },
            {
                name: '24-70mm Lens',
                description: 'Professional zoom lens',
                quantity: 1,
                price: 600.00,
                weight: 0.8
            },
            {
                name: 'Tripod',
                description: 'Professional camera tripod',
                quantity: 1,
                price: 100.50,
                weight: 2.0
            }
        ],
        orderNumber: 'ORD-000006',
        shippingMethod: 'international',
        status: 'delivered',
        totalAmount: 3200.50,
        shippingCost: 100.00,
        tax: 0.00,
        notes: 'Professional photography equipment',
        estimatedDelivery: new Date('2024-01-15'),
        actualDelivery: new Date('2024-01-14'),
        platform: 'Website',
        callResult: 'Confirmed',
        agent: 'Nour Samir'
    },
    {
        customer: {
            name: 'Yasmin Farouk',
            email: 'yasmin.farouk@email.com',
            phone: '+201112345678'
        },
        shippingAddress: {
            street: '67 Suez Canal Street, Port Said',
            city: 'Port Said',
            state: 'Port Said',
            zipCode: '42511',
            country: 'Egypt'
        },
        items: [
            {
                name: 'Sony WH-1000XM5 Headphones',
                description: 'Noise-cancelling wireless headphones',
                quantity: 1,
                price: 400.00,
                weight: 0.3
            },
            {
                name: 'JBL Speaker',
                description: 'Portable Bluetooth speaker',
                quantity: 1,
                price: 150.00,
                weight: 0.5
            },
            {
                name: 'Blue Yeti Microphone',
                description: 'Professional USB microphone',
                quantity: 1,
                price: 250.75,
                weight: 0.8
            }
        ],
        orderNumber: 'ORD-000007',
        shippingMethod: 'express',
        status: 'processing',
        totalAmount: 1800.75,
        shippingCost: 40.00,
        tax: 0.00,
        notes: 'Audio equipment for content creation',
        estimatedDelivery: new Date('2024-01-23'),
        platform: 'Mobile App',
        callResult: 'Confirmed',
        agent: 'Alaa Hassan'
    },
    {
        customer: {
            name: 'Khaled Nasser',
            email: 'khaled.nasser@email.com',
            phone: '+209998765432'
        },
        shippingAddress: {
            street: '34 Canal Street, Ismailia',
            city: 'Ismailia',
            state: 'Ismailia',
            zipCode: '41511',
            country: 'Egypt'
        },
        items: [
            {
                name: 'Apple Watch Series 9',
                description: 'Latest Apple Watch with health monitoring',
                quantity: 1,
                price: 400.00,
                weight: 0.1
            },
            {
                name: 'Sport Band',
                description: 'Apple Watch sport band',
                quantity: 2,
                price: 50.00,
                weight: 0.05
            }
        ],
        orderNumber: 'ORD-000008',
        shippingMethod: 'standard',
        status: 'returned',
        totalAmount: 950.00,
        shippingCost: 20.00,
        tax: 0.00,
        notes: 'Refund processed - customer not satisfied',
        estimatedDelivery: new Date('2024-01-20'),
        platform: 'Social Media',
        callResult: 'Refund Initiated',
        agent: 'Mona Youssef'
    }
];

// Connect to database and seed data
async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas');

        // Clear existing data
        await User.deleteMany({});
        await Order.deleteMany({});
        console.log('Cleared existing data');

        // Insert sample users
        const users = await User.insertMany(sampleUsers);
        console.log(`Inserted ${users.length} users`);

        // Insert sample orders one by one to ensure orderNumber generation
        const orders = [];
        for (let i = 0; i < sampleOrders.length; i++) {
            const order = new Order(sampleOrders[i]);
            await order.save();
            orders.push(order);
        }
        console.log(`Inserted ${orders.length} orders`);

        console.log('\n✅ Database seeded successfully!');
        console.log(`📊 Users: ${users.length}`);
        console.log(`📦 Orders: ${orders.length}`);
        console.log('\n🌐 You can now test your application at: http://localhost:3000');

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
}

// Run the seeding function
seedDatabase();
