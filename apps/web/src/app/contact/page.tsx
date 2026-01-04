"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Globe, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Contact Us
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400">
            Get in touch with the LawSphere team
          </p>
        </div>

        {/* Contact Info */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Contact Methods */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              Reach Out
            </h2>
            
            <a 
              href="mailto:contact@antixxtechhub.com"
              className="flex items-center p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 transition-colors"
            >
              <Mail className="h-6 w-6 text-primary-600 mr-4" />
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Email</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">contact@antixxtechhub.com</p>
              </div>
            </a>

            <a 
              href="https://antixxtechhub.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 transition-colors"
            >
              <Globe className="h-6 w-6 text-primary-600 mr-4" />
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Website</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">antixxtechhub.com</p>
              </div>
            </a>
          </div>

          {/* Social Links */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              Follow Us
            </h2>

            <a 
              href="https://www.linkedin.com/company/antixx-techhub/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 transition-colors"
            >
              <Linkedin className="h-6 w-6 text-[#0A66C2] mr-4" />
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">LinkedIn</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Antixx TechHub</p>
              </div>
            </a>

            <a 
              href="https://twitter.com/antixx_techhub"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 transition-colors"
            >
              <Twitter className="h-6 w-6 text-neutral-900 dark:text-white mr-4" />
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Twitter / X</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">@antixx_techhub</p>
              </div>
            </a>
          </div>
        </div>

        {/* Company Info */}
        <div className="text-center p-6 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <p className="text-neutral-600 dark:text-neutral-400">
            LawSphere is developed and maintained by{" "}
            <a 
              href="https://antixxtechhub.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline font-medium"
            >
              Antixx TechHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
