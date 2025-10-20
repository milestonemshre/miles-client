import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createAuthHeaders, validateAuthToken } from '../../services/api';

interface Lead {
  _id: string;
  Name: string;
  Type?: string;
  Project?: string;
  Budget?: string;
  dynamicFields?: Record<string, any>;
}

interface RequirementField {
  _id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'list';
  options?: string[];
}

interface RequirementsSectionProps {
  lead: Lead;
}

const RequirementsSection: React.FC<RequirementsSectionProps> = ({ lead }) => {
  const [requirementFields, setRequirementFields] = useState<RequirementField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirementFields = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!(await validateAuthToken())) {
          setError('Authentication failed');
          // Still show default fields even if auth fails
          setRequirementFields([
            { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
            { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
            { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
          ]);
          return;
        }

        const headers = await createAuthHeaders();
        const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/requirement-fields?includeInactive=false`, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('RequirementsSection - API Response:', {
            fieldsCount: data.fields?.length || 0,
            fields: data.fields?.map((f: any) => ({ name: f.name, label: f.label, type: f.type })) || []
          });
          const fields = data.fields || [];
          
          // If no fields returned, try to initialize default fields first
          if (fields.length === 0) {
            console.log('RequirementsSection - No fields returned, attempting to initialize defaults');
            try {
              // Try to initialize default fields
              const initResponse = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/requirement-fields/initialize`, {
                method: 'POST',
                headers,
              });
              
              if (initResponse.ok) {
                const initData = await initResponse.json();
                console.log('RequirementsSection - Successfully initialized default fields:', initData.fields?.length || 0);
                setRequirementFields(initData.fields || []);
              } else {
                // If initialization fails, fall back to hardcoded defaults
                console.log('RequirementsSection - Initialization failed, using hardcoded defaults');
                setRequirementFields([
                  { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
                  { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
                  { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
                ]);
              }
            } catch (initError) {
              console.error('RequirementsSection - Error during initialization:', initError);
              // Fall back to hardcoded defaults
              setRequirementFields([
                { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
                { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
                { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
              ]);
            }
          } else {
            setRequirementFields(fields);
          }
        } else {
          console.error('RequirementsSection - Failed to fetch requirement fields:', response.status);
          // Use default fields as fallback
          setRequirementFields([
            { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
            { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
            { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
          ]);
        }
      } catch (error) {
        console.error('Error fetching requirement fields:', error);
        setError('Failed to load requirement fields');
        // Use default fields as fallback
        setRequirementFields([
          { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
          { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
          { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequirementFields();
  }, []);

  const renderInfoRow = (label: string, value: string | undefined) => {
    if (!value) return null;

    return (
      <View key={label} className="border-b border-gray-100 py-2 last:border-b-0">
        <Text className="text-sm font-medium text-gray-500 mb-1">{label}:</Text>
        <Text className="text-base text-gray-900">{value}</Text>
      </View>
    );
  };

  const getDynamicFieldValue = (fieldName: string): string => {
    // First check if it's a default field stored directly on the lead
    if (lead[fieldName as keyof Lead] !== undefined) {
      return String(lead[fieldName as keyof Lead] || '');
    }

    // Then check the dynamicFields object
    if (lead.dynamicFields && lead.dynamicFields[fieldName] !== undefined) {
      return String(lead.dynamicFields[fieldName] || '');
    }

    return '';
  };

  if (loading) {
    return (
      <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">Requirements</Text>
        <View className="flex-row items-center justify-center py-4">
          <ActivityIndicator size="small" color="#124b68" />
          <Text className="text-gray-500 ml-2">Loading requirements...</Text>
        </View>
      </View>
    );
  }

  // Note: Removed error display since we now have fallbacks to always show default fields

  // Combine all requirement fields (both default and dynamic) into a single list
  const allRequirementFields = [
    // Default fields first
    ...['Type', 'Project', 'Budget'].map(name => {
      const field = requirementFields.find(f => f.name === name);
      return {
        _id: `default_${name}`,
        name,
        label: field?.label || name,
        type: field?.type || 'string' as const,
        options: field?.options,
        isDefault: true
      };
    }),
    // Then dynamic fields
    ...requirementFields
      .filter(field => !['Type', 'Project', 'Budget'].includes(field.name))
      .map(field => ({ ...field, isDefault: false }))
  ];

  // Get all fields that have values
  const fieldsWithValues = allRequirementFields.filter(field => {
    const value = getDynamicFieldValue(field.name);
    return value && value.trim() !== '';
  });

  if (fieldsWithValues.length === 0) {
    return (
      <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">Requirements</Text>
        <Text className="text-sm text-gray-500 italic">No requirements specified</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <Text className="text-lg font-semibold text-gray-900 mb-3">Requirements</Text>
      
      {/* All requirement fields in a single section */}
      {fieldsWithValues.map(field => {
        const value = getDynamicFieldValue(field.name);
        return renderInfoRow(field.label, value);
      })}
      
    </View>
  );
};

export default RequirementsSection;