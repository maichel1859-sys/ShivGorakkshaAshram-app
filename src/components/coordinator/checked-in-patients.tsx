"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Clock,
  Phone,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCheckedInPatients } from '@/lib/actions/coordinator-actions';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface CheckedInPatient {
  id: string;
  status: string;
  checkedInAt: Date;
  estimatedWait?: number;
  position?: number;
  priority: string;
  user: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  guruji?: {
    id: string;
    name: string;
  };
  appointment?: {
    id: string;
    date: Date;
    startTime: Date;
    reason?: string;
  };
}

export function CheckedInPatients() {
  const { t } = useLanguage();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch checked-in patients data
  const {
    data: patients = [],
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['checkedInPatients'],
    queryFn: async () => {
      const result = await getCheckedInPatients();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch checked-in patients');
      }
      return result.patients || [];
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!isRefetching) {
      setLastRefresh(new Date());
    }
  }, [isRefetching]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'CHECKED_IN':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800';
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            {t('reception.checkedInPatients.error', 'Error Loading Patients')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('reception.checkedInPatients.title', 'Checked-In Patients')}
            <Badge variant="secondary">{patients.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('common.lastUpdate', 'Last updated')}: {format(lastRefresh, 'HH:mm:ss')}
            </span>
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              {t('common.loading', 'Loading...')}
            </span>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              {t('reception.checkedInPatients.noPatients', 'No Checked-In Patients')}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {t('reception.checkedInPatients.noPatientsDescription', 'All patients have been seen or no appointments are checked in yet.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {patient.user.name
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{patient.user.name}</h4>
                      <Badge className={getStatusColor(patient.status)}>
                        {patient.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(patient.priority)}>
                        {patient.priority}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {patient.user.phone && (
                        <span className="flex items-center">
                          <Phone className="mr-1 h-3 w-3" />
                          {patient.user.phone}
                        </span>
                      )}

                      <span className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {t('reception.checkedInPatients.checkedInAt', 'Checked in')}: {format(patient.checkedInAt, 'HH:mm')}
                      </span>

                      {patient.position && (
                        <span className="flex items-center">
                          <Users className="mr-1 h-3 w-3" />
                          {t('queue.position', 'Position')}: #{patient.position}
                        </span>
                      )}
                    </div>

                    {/* Appointment Details */}
                    {patient.appointment && (
                      <div className="text-sm text-muted-foreground mt-2 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(patient.appointment.date, 'MMM dd, yyyy')} at{' '}
                            {format(patient.appointment.startTime, 'h:mm a')}
                          </span>
                        </div>
                        {patient.appointment.reason && (
                          <p>
                            <strong>{t('appointments.reason', 'Reason')}:</strong> {patient.appointment.reason}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Guruji Assignment */}
                    {patient.guruji && (
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="flex items-center">
                          <User className="mr-1 h-3 w-3" />
                          <strong>{t('appointments.assignedTo', 'Assigned to')}:</strong>
                          <span className="ml-1">{patient.guruji.name}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  {patient.estimatedWait && (
                    <div className="text-sm text-muted-foreground text-right">
                      <span className="font-medium">
                        {t('queue.estimatedWait', 'Est. wait')}: {patient.estimatedWait}m
                      </span>
                    </div>
                  )}

                  <div className="flex items-center space-x-1">
                    {patient.status === 'WAITING' && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    )}
                    {patient.status === 'IN_PROGRESS' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {patient.status === 'WAITING' && t('queue.waiting', 'Waiting')}
                      {patient.status === 'IN_PROGRESS' && t('queue.inProgress', 'In progress')}
                      {patient.status === 'CHECKED_IN' && t('queue.checkedIn', 'Ready')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}