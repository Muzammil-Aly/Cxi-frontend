"use client";
import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { useGetCustomerEventsQuery } from "@/redux/services/profileApi";
import CloseIcon from "@mui/icons-material/Close";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { exportToExcel } from "@/utils/exportToExcel";

import Loader from "@/components/Common/Loader";
import CustomSearchField from "@/components/Common/CustomSearch";
import { Phone, Send, SpaceBar } from "@mui/icons-material";
import debounce from "lodash.debounce";

import { marketing_events } from "@/constants/Grid-Table/ColDefs";
import useMarketingEvents from "@/hooks/Ag-Grid/useMarketingItems";
import AgGridTable from "@/components/ag-grid";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { getRowStyle } from "@/utils/gridStyles";
import SearchInput from "@/components/Common/CustomSearch/SearchInput";
import CustomDatePicker from "@/components/Common/DatePicker/DatePicker";
import CustomSelect from "@/components/Common/CustomTabs/CustomSelect";
import { useGetCustomerNamesQuery } from "@/redux/services/MarketingEvents";
import DropdownSearchInput from "@/components/Common/CustomSearch/DropdownSearchInput";
interface MarketingEventsProps {
  customerId?: string; // optional prop
}
const MarketingEvents: React.FC<MarketingEventsProps> = ({ customerId }) => {
  // Use column preferences hook
  const {
    filteredColumns,
    handleColumnMoved,
    handleResetColumns,
    storageKey,
    allColumnsWithVisibility,
    toggleColumnVisibility,
    updateColumnsVisibility,
    isSaving,
  } = useColumnPreferences({
    endpoint: "customer_events",
    tabName: "Marketing Events",
    defaultColumns: marketing_events,
  });

  // Apply column customization
  const eventCol = useMarketingEvents(filteredColumns);
  const excelCol = useMarketingEvents(marketing_events);
  const handleExport = () => {
    exportToExcel({
      data: rowData,
      columns: eventCol,
      fileName: "Marketing_Events.xlsx",
    });
  };

  const [highlightedId, setHighlightedId] = useState<string | number | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [eventIdFilter, setEventIdFilter] = useState<string | undefined>();
  const [customerIdFilter, setCustomerIdFilter] = useState<
    string | undefined
  >();
  const [campaignFilter, setCampaignFilter] = useState<string | undefined>();
  const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [customerNameFilter, setCustomerNameFilter] = useState<
    string | undefined
  >(undefined);
  const [customerNameInput, setCustomerNameInput] = useState("");
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined);
  const [dateInput, setDateInput] = useState<any>(null);
  const [eventIdInput, setEventIdInput] = useState("");
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [isEventIdTyping, setIsEventIdTyping] = useState(false);
  const [isCustomerIdTyping, setIsCustomerIdTyping] = useState(false);
  const [isCustomerNameTyping, setIsCustomerNameTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const { data, isLoading, isFetching } = useGetCustomerEventsQuery({
    page,
    page_size: pageSize,
    source: "Marketing Events",
    event_id: eventIdFilter,
    customer_id: customerIdFilter || customerId,
    campaign_name: campaignFilter,
    email: searchTerm || undefined,
    customer_name: customerNameFilter || undefined,
    event_type: eventTypeFilter,
    event_timestamp: dateFilter || undefined,
  });

  const rowData = useMemo(() => {
    const results = data?.data || [];
    return results.map((item: any) => ({
      event_id: item.event_id,
      event_type: item.event_type,
      customer_id: item.customer_id ?? "N/A",
      customer_name: item.customer_name || "N/A",
      email: item.email || "N/A",

      event_timestamp: item.event_timestamp
        ? item.event_timestamp.split("T")[0]
        : "N/A",
      campaign_name: item.campaign_name,
    }));
  }, [data]);

  const {
    data: customerNameSuggestions = [],
    isFetching: isCustomerNameLoading,
  } = useGetCustomerNamesQuery(customerNameInput, {
    skip: customerNameInput.trim().length < 1,
  });

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (value.trim() === "") {
      setSearchTerm("");
      setPage(1);
      debouncedSearch.cancel(); // cancel pending debounce
    } else {
      debouncedSearch(value);
      setIsTyping(true);
    }
  };
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchTerm(value);
        setPage(1);
        setIsTyping(false);
      }, 5000),
    [],
  );

  const debouncedCustomerName = useMemo(
    () =>
      debounce((value: string) => {
        setCustomerNameFilter(value ? value : undefined);
        setPage(1);
        setIsCustomerNameTyping(false);
      }, 5000),
    [],
  );
  const debouncedEventId = useMemo(
    () =>
      debounce((value: string) => {
        setEventIdFilter(value);
        setPage(1);
        setIsEventIdTyping(false);
      }, 5000),
    [],
  );
  const debouncedCustomerId = useMemo(
    () =>
      debounce((value: string) => {
        setCustomerIdFilter(value ? value.toUpperCase() : undefined);
        setPage(1);
        setIsCustomerIdTyping(false);
      }, 5000),
    [],
  );
  const debouncedCampainName = useMemo(
    () =>
      debounce((value: string) => {
        setCustomerNameFilter(value ? value : undefined);
        setPage(1);
        setIsCustomerNameTyping(false);
      }, 5000),
    [],
  );
  return (
    <Box display="flex">
      <Box flex={1} pl={customerId ? 0 : 8}>
        {!customerId && (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="flex-start"
            alignItems="stretch"
            gap={2}
            mb={2}
            pl={1}
          >
            {/* Top row: Email search + Event Time + Page Size */}
            <Box
              display="flex"
              flexWrap="wrap"
              justifyContent="space-between"
              alignItems="center"
              gap={2}
              mt="1px"
            >
              {/* Email Search */}
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                flex={1}
                minWidth={200}
              >
                <CustomSearchField
                  value={searchInput}
                  onChange={handleSearchInput}
                  placeholder="Search by Email"
                  fullWidth
                  InputProps={{
                    endAdornment: searchInput.trim() !== "" && isTyping && (
                      <InputAdornment position="end">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Send
                  onClick={() => {
                    setSearchTerm(searchInput);
                    setPage(1);
                  }}
                  style={{
                    cursor: "pointer",
                    color: "#004FA7",
                    height: 36,
                    width: 36,
                  }}
                />
              </Box>

              {/* Event Time Stamp */}
              <CustomDatePicker
                label="Event Time Stamp"
                value={dateInput}
                setValue={setDateInput}
                setFilter={setDateFilter}
                setPage={setPage}
              />

              {/* Page Size */}
              <CustomSelect
                label="Page Size"
                value={pageSize}
                options={[10, 50, 100]}
                onChange={(val) => {
                  setPageSize(val);
                  setPage(1);
                }}
              />
            </Box>

            {/* Filters row */}
            <Box display="flex" flexWrap="wrap" gap={2}>
              <DropdownSearchInput
                label="Customer Name"
                value={customerNameInput}
                setValue={setCustomerNameInput}
                setFilter={setCustomerNameFilter}
                debouncedFunction={debouncedCustomerName}
                loading={isCustomerNameLoading}
                suggestions={customerNameSuggestions?.results || []}
                width={150}
              />

              <SearchInput
                label="Event ID"
                value={eventIdInput}
                setValue={(val) => {
                  setEventIdInput(val);
                  setIsEventIdTyping(true);
                }}
                setFilter={setEventIdFilter}
                debouncedFunction={debouncedEventId}
                loading={isEventIdTyping}
                width={150}
              />

              <SearchInput
                label="Customer ID"
                value={customerIdInput}
                setValue={(val) => {
                  setCustomerIdInput(val);
                  setIsCustomerIdTyping(true);
                }}
                setFilter={setCustomerIdFilter}
                debouncedFunction={debouncedCustomerId}
                loading={isCustomerIdTyping}
                width={150}
              />
            </Box>
          </Box>
        )}
        {isLoading || isFetching ? (
          <Loader />
        ) : (
          <Box p={customerId ? 1 : 0}>
            <AgGridTable
              rowData={rowData}
              columnDefs={eventCol}
              // onRowClicked={onRowClicked}
              getRowStyle={getRowStyle(highlightedId)}
              height={480}
              enablePagination
              currentPage={page}
              totalPages={data?.total_pages || 1}
              onPageChange={(newPage: any) => setPage(newPage)}
              pagination={false}
              style={{ width: "100%", overflowX: "auto" }}
              paginationPageSize={pageSize}
              onColumnMoved={handleColumnMoved}
              onResetColumns={handleResetColumns}
              storageKey={storageKey}
              allColumnsWithVisibility={allColumnsWithVisibility}
              onToggleColumnVisibility={toggleColumnVisibility}
              onUpdateColumnsVisibility={updateColumnsVisibility}
              isVisibilityLoading={isSaving}
              onExport={handleExport}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MarketingEvents;
