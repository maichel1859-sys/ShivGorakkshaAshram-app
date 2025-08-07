import { redirect } from "next/navigation";
import { auth } from "@/lib/core/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calendar,
  Clock,
  Heart,
  Users,
  Shield,
  Smartphone,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  // Server-side redirect for authenticated users
  if (session?.user) {
    switch (session.user.role) {
      case "ADMIN":
        redirect("/admin");
      case "COORDINATOR":
        redirect("/coordinator");
      case "GURUJI":
        redirect("/guruji");
      default:
        redirect("/user");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ashram Management System
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/signin">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Spiritual Wellness Made Simple
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Complete management system for ashram appointments, consultations,
            and remedy delivery. Connect with spiritual guidance seamlessly
            through our modern platform.
          </p>
          <div className="space-x-4">
            <Link href="/signup">
              <Button size="lg" className="px-8 py-3">
                Book Your First Appointment
              </Button>
            </Link>
            <Link href="/signin">
              <Button variant="outline" size="lg" className="px-8 py-3">
                Sign In to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need for Spiritual Care
          </h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Our comprehensive platform brings together appointment booking,
            queue management, consultations, and remedy delivery in one seamless
            experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Calendar className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Easy Appointment Booking</CardTitle>
              <CardDescription>
                Schedule your consultations with preferred Gurujis at your
                convenience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Real-time availability</li>
                <li>• Recurring appointments</li>
                <li>• Instant confirmations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Smartphone className="h-12 w-12 text-primary mb-4" />
              <CardTitle>QR Code Check-in</CardTitle>
              <CardDescription>
                Quick and contactless check-in process with QR code scanning.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Contactless check-in</li>
                <li>• Instant queue updates</li>
                <li>• Mobile-friendly</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Clock className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Real-time Queue Management</CardTitle>
              <CardDescription>
                Stay informed about your position and estimated wait times.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Live queue updates</li>
                <li>• Wait time estimates</li>
                <li>• SMS & email alerts</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Consultation Interface</CardTitle>
              <CardDescription>
                Dedicated tools for Gurujis to manage consultations efficiently.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• Patient history access</li>
                <li>• Digital note taking</li>
                <li>• Remedy prescription</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Heart className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Digital Remedy Delivery</CardTitle>
              <CardDescription>
                Receive personalized remedies and instructions digitally.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• PDF remedy documents</li>
                <li>• Multi-language support</li>
                <li>• Email & SMS delivery</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Role-based Access</CardTitle>
              <CardDescription>
                Secure system with appropriate access levels for all users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>• User, Coordinator, Guruji, Admin roles</li>
                <li>• Secure authentication</li>
                <li>• Data privacy protection</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-primary text-primary-foreground rounded-2xl p-12 text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Begin Your Spiritual Journey?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands who have found peace and guidance through our
            platform.
          </p>
          <div className="space-x-4">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="px-8 py-3">
                Create Account
              </Button>
            </Link>
            <Link href="/signin">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-3 border-white text-white hover:bg-white hover:text-primary"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="text-center text-gray-600 dark:text-gray-300">
          <p>
            &copy; 2024 Ashram Management System. Built with ❤️ for spiritual
            wellness.
          </p>
        </div>
      </footer>
    </div>
  );
}
