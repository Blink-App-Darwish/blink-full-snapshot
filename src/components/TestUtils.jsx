/**
 * Test Utilities
 * Helper functions for testing and test data generation
 */

import { User, Event, Enabler, Package, Booking, Contract, Reservation } from "@/api/entities";

class TestUtils {
  /**
   * Seed test data
   */
  async seedTestData() {
    console.log("🌱 Seeding test data...");

    try {
      // Create test users
      const testUsers = await this.createTestUsers();
      console.log(`✅ Created ${testUsers.length} test users`);

      // Create test enablers
      const testEnablers = await this.createTestEnablers(testUsers);
      console.log(`✅ Created ${testEnablers.length} test enablers`);

      // Create test packages
      const testPackages = await this.createTestPackages(testEnablers);
      console.log(`✅ Created ${testPackages.length} test packages`);

      // Create test events
      const testEvents = await this.createTestEvents(testUsers);
      console.log(`✅ Created ${testEvents.length} test events`);

      // Create test bookings
      const testBookings = await this.createTestBookings(testEvents, testEnablers, testPackages);
      console.log(`✅ Created ${testBookings.length} test bookings`);

      console.log("✅ Test data seeding completed!");

      return {
        users: testUsers,
        enablers: testEnablers,
        packages: testPackages,
        events: testEvents,
        bookings: testBookings
      };

    } catch (error) {
      console.error("❌ Error seeding test data:", error);
      throw error;
    }
  }

  /**
   * Create test users
   */
  async createTestUsers() {
    const users = [];
    
    const testUserData = [
      { full_name: "Alice Host", email: "alice@test.com", user_type: "host", phone: "+1234567890" },
      { full_name: "Bob Enabler", email: "bob@test.com", user_type: "enabler", phone: "+1234567891" },
      { full_name: "Charlie Both", email: "charlie@test.com", user_type: "both", phone: "+1234567892" }
    ];

    for (const userData of testUserData) {
      try {
        const existing = await User.filter({ email: userData.email });
        if (existing.length === 0) {
          const user = await User.create({
            ...userData,
            profile_completed: true,
            profile_image: "https://i.pravatar.cc/150?img=" + Math.floor(Math.random() * 70)
          });
          users.push(user);
        } else {
          users.push(existing[0]);
        }
      } catch (error) {
        console.warn(`Could not create user ${userData.email}:`, error.message);
      }
    }

    return users;
  }

  /**
   * Create test enablers
   */
  async createTestEnablers(users) {
    const enablers = [];
    
    const enablerUser = users.find(u => u.user_type === "enabler" || u.user_type === "both");
    if (!enablerUser) return enablers;

    const testEnablerData = [
      {
        business_name: "Elegant Events Co",
        category: "event_planner",
        profession_title: "Professional Event Planner",
        location: "Dubai, UAE",
        base_price: 2000,
        years_experience: 10
      },
      {
        business_name: "Perfect Photos Studio",
        category: "photographer",
        profession_title: "Wedding Photographer",
        location: "Abu Dhabi, UAE",
        base_price: 1500,
        years_experience: 8
      },
      {
        business_name: "DJ Maestro",
        category: "dj",
        profession_title: "Professional DJ",
        location: "Dubai, UAE",
        base_price: 1000,
        years_experience: 5
      }
    ];

    for (const data of testEnablerData) {
      try {
        const enabler = await Enabler.create({
          user_id: enablerUser.id,
          ...data,
          profile_completed: true,
          portfolio_completed: true,
          is_primary: enablers.length === 0,
          average_rating: 4.5 + Math.random() * 0.5,
          total_reviews: Math.floor(Math.random() * 50) + 10
        });
        enablers.push(enabler);
      } catch (error) {
        console.warn(`Could not create enabler ${data.business_name}:`, error.message);
      }
    }

    return enablers;
  }

  /**
   * Create test packages
   */
  async createTestPackages(enablers) {
    const packages = [];

    for (const enabler of enablers) {
      const testPackages = [
        {
          name: "Basic Package",
          description: "Essential services for your event",
          price: enabler.base_price,
          features: [
            { icon: "✓", text: "4 hours of service", included: true },
            { icon: "✓", text: "Basic setup", included: true },
            { icon: "✗", text: "Premium features", included: false }
          ]
        },
        {
          name: "Premium Package",
          description: "Complete premium experience",
          price: enabler.base_price * 1.5,
          features: [
            { icon: "✓", text: "8 hours of service", included: true },
            { icon: "✓", text: "Premium setup", included: true },
            { icon: "✓", text: "All premium features", included: true }
          ]
        }
      ];

      for (const pkgData of testPackages) {
        try {
          const pkg = await Package.create({
            enabler_id: enabler.id,
            ...pkgData,
            currency: "USD",
            max_guests: 100
          });
          packages.push(pkg);
        } catch (error) {
          console.warn(`Could not create package:`, error.message);
        }
      }
    }

    return packages;
  }

  /**
   * Create test events
   */
  async createTestEvents(users) {
    const events = [];
    
    const hostUser = users.find(u => u.user_type === "host" || u.user_type === "both");
    if (!hostUser) return events;

    const testEventData = [
      {
        name: "Dream Wedding Ceremony",
        type: "wedding",
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: "Burj Al Arab, Dubai",
        guest_count: 150,
        budget: 50000,
        theme: "Elegant & Timeless",
        status: "planning"
      },
      {
        name: "Corporate Launch Event",
        type: "corporate",
        date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: "DIFC, Dubai",
        guest_count: 200,
        budget: 75000,
        theme: "Modern & Professional",
        status: "planning"
      }
    ];

    for (const data of testEventData) {
      try {
        const event = await Event.create({
          host_id: hostUser.id,
          ...data
        });
        events.push(event);
      } catch (error) {
        console.warn(`Could not create event:`, error.message);
      }
    }

    return events;
  }

  /**
   * Create test bookings
   */
  async createTestBookings(events, enablers, packages) {
    const bookings = [];

    if (events.length === 0 || enablers.length === 0 || packages.length === 0) {
      return bookings;
    }

    const event = events[0];
    const enabler = enablers[0];
    const pkg = packages.find(p => p.enabler_id === enabler.id) || packages[0];

    try {
      const booking = await Booking.create({
        event_id: event.id,
        enabler_id: enabler.id,
        package_id: pkg.id,
        total_amount: pkg.price,
        status: "pending",
        payment_status: "pending"
      });
      bookings.push(booking);
    } catch (error) {
      console.warn(`Could not create booking:`, error.message);
    }

    return bookings;
  }

  /**
   * Clean test data
   */
  async cleanTestData() {
    console.log("🧹 Cleaning test data...");

    try {
      // Note: In production, add proper cascading delete logic
      const testEmails = ["alice@test.com", "bob@test.com", "charlie@test.com"];
      
      for (const email of testEmails) {
        const users = await User.filter({ email });
        for (const user of users) {
          // Clean related data first
          const enablers = await Enabler.filter({ user_id: user.id });
          for (const enabler of enablers) {
            const packages = await Package.filter({ enabler_id: enabler.id });
            for (const pkg of packages) {
              await Package.delete(pkg.id);
            }
            await Enabler.delete(enabler.id);
          }

          const events = await Event.filter({ host_id: user.id });
          for (const event of events) {
            const bookings = await Booking.filter({ event_id: event.id });
            for (const booking of bookings) {
              await Booking.delete(booking.id);
            }
            await Event.delete(event.id);
          }
        }
      }

      console.log("✅ Test data cleaned!");
    } catch (error) {
      console.error("❌ Error cleaning test data:", error);
    }
  }

  /**
   * Generate random test data
   */
  generateRandomEvent() {
    const types = ["wedding", "birthday", "corporate", "conference"];
    const locations = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"];
    
    return {
      name: `Test Event ${Date.now()}`,
      type: types[Math.floor(Math.random() * types.length)],
      date: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      location: locations[Math.floor(Math.random() * locations.length)],
      guest_count: Math.floor(Math.random() * 200) + 50,
      budget: Math.floor(Math.random() * 50000) + 10000,
      status: "planning"
    };
  }
}

export default new TestUtils();