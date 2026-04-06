"use client";
import AgGridTable from "@/components/ag-grid";
import { users } from "@/constants/Grid-Table/ColDefs";

import useUsersColumn from "@/hooks/Ag-Grid/useUsersColumn";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import ClearIcon from "@mui/icons-material/Clear";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  TextField,
  Autocomplete,
  ListSubheader,
  InputAdornment,
  CircularProgress,
  IconButton,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import React, { useState, useMemo } from "react";
import UserDetailsModal from "../profile-Information/UserDetailsModal";
import CustomSearchField from "@/components/Common/CustomSearch";
import { Phone, Send } from "@mui/icons-material";
import debounce from "lodash.debounce";
import { useGetProfilesQuery } from "@/redux/services/profileApi";
import Loader from "@/components/Common/Loader";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { getRowStyle } from "@/utils/gridStyles";
import SearchInput from "@/components/Common/CustomSearch/SearchInput";
import CustomDatePicker from "@/components/Common/DatePicker/DatePicker";
import CustomSelect from "@/components/Common/CustomTabs/CustomSelect";
import {
  useGetFullNamesQuery,
  useGetPhoneQuery,
} from "@/redux/services/profileApi";
import DropdownSearchInput from "@/components/Common/CustomSearch/DropdownSearchInput";
import { exportToExcel } from "@/utils/exportToExcel";
interface SegmentOption {
  id: string;
  name: string;
}
const DetailedInfo = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sourceFilter, setSourceFilter] = useState<string | undefined>(
    undefined,
  );
  const [customerIdFilter, setCustomerIdFilter] = useState<string | undefined>(
    undefined,
  );
  const [fullNameFilter, setFullNameFilter] = useState<string | undefined>(
    undefined,
  );
  const [phoneNumberFilter, setPhoneNumberFilter] = useState<
    string | undefined
  >(undefined);
  const [customerIdInput, setCustomerIdInput] = useState("");

  const [fullNameInput, setFullNameInput] = useState("");
  const [phoneNumberInput, setPhoneNumberInput] = useState("");
  const [isCustomerIDTyping, setIsCustomerIDTyping] = useState(false);
  const [isFullNameTyping, setIsFullNameTyping] = useState(false);
  const [isPhoneNumberTyping, setIsPhoneNumberTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined);
  const [lastDateFilter, setLastDateFilter] = useState<string | undefined>(
    undefined,
  );
  const [lastDateInput, setLastDateInput] = useState<any>(null);

  const [dateInput, setDateInput] = useState<any>(null);
  const [highlightedId, setHighlightedId] = useState<string | number | null>(
    null,
  );
  const { data, isLoading, refetch, isFetching } = useGetProfilesQuery(
    {
      page,
      page_size: pageSize,
      email: searchTerm || undefined,
      source: sourceFilter || undefined,
      tab: "Customer Profiles",
      customer_id: customerIdFilter || undefined,
      full_name: fullNameFilter || undefined,
      phone: phoneNumberFilter || undefined,
      created_at: dateFilter || undefined,
      last_order_date: lastDateFilter || undefined,
    },
    { skip: false },
  );
  const { data: fullNameSuggestions = [], isFetching: isFullNameLoading } =
    useGetFullNamesQuery(fullNameInput, {
      skip: fullNameInput.trim().length < 1,
    });

  const { data: PhoneSuggestions = [], isFetching: isPhoneLoading } =
    useGetPhoneQuery(phoneNumberInput, {
      skip: phoneNumberInput.trim().length < 1,
    });

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
    endpoint: "customer_profile",
    tabName: "Profile Information",
    defaultColumns: users,
    storageKey: "profile-info-grid-columns", // Match existing storageKey
  });

  // Apply column customization
  const userCol = useUsersColumn(filteredColumns);

  const rowData = useMemo(() => {
    const results = data?.data || [];

    return results.map((item: any) => {
      return {
        email: item.email,
        phone: item.phone || "",
        full_name: item.full_name || "",
        source: item.source || "",
        customer_id: item.customer_id || "",
        join_type: item.join_type || "",
        key: item.key || "",
        created_at: item.created_at ? item.created_at.split("T")[0] : "N/A",

        last_order_date: item.last_order_date
          ? item.last_order_date.split("T")[0]
          : "N/A",
        total_orders: item.total_orders || "",
      };
    });
  }, [data]);

  const onRowClicked = (params: any) => {
    const event = params?.event;
    if ((event?.target as HTMLElement).closest(".MuiIconButton-root")) {
      return; // ignore clicks from any MUI icon button
    }
    const { customer_id } = params.data;

    setSelectedUser(params.data);

    setHighlightedId(customer_id);

    setModalOpen(true);
  };

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

  const sourceOptions = ["Klaviyo", "Shopify", "Wismo", "Zendesk"];
  const debouncedCustomerId = useMemo(
    () =>
      debounce((value: string) => {
        setCustomerIdFilter(value ? value.toUpperCase() : undefined);
        setPage(1);
        setIsCustomerIDTyping(false);
      }, 5000),
    [],
  );

  const debouncedFullName = useMemo(
    () =>
      debounce((value: string) => {
        setFullNameFilter(value ? value : undefined);
        setPage(1);
        setIsFullNameTyping(false);
      }, 5000),
    [],
  );

  const debouncedPhoneNumber = useMemo(
    () =>
      debounce((value: string) => {
        setPhoneNumberFilter(value ? value : undefined);
        setPage(1);
        setIsPhoneNumberTyping(false);
      }, 5000),
    [],
  );

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearchTerm(value);
        setPage(1);
        setIsTyping(false);
      }, 5000),
    [],
  );

  const toggleSouceoptions = (option: string) => {
    // If same option clicked again → clear selection
    setSourceFilter((prev) => (prev === option ? "" : option));
  };
  const handleExport = () => {
    exportToExcel({
      data: rowData,
      columns: userCol, // directly use your AG Grid columns
      fileName: "Customer_Profiles.xlsx",
    });
  };
  return (
    <Box flex={1} pl={8} width="100%">
      <Box display="flex" flexDirection="column" width="100%" mb={2}>
        {/* Top row: Search + Page Size */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          width="100%"
          mb={2}
          flexWrap="wrap"
        >
          <Box
            display="flex"
            alignItems="center"
            flex={1}
            minWidth={200}
            mb={{ xs: 1, sm: 0 }}
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
                marginLeft: 8,
              }}
            />
          </Box>
          <Box display="flex" alignItems="center" mt={2}>
            <Box minWidth={95}>
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
          </Box>
        </Box>

        {/* Filters Row */}
        <Box
          display="flex"
          flexWrap="wrap"
          justifyContent="flex-start"
          alignItems="center"
          gap={2}
          mb={2}
        >
          <SearchInput
            label="Customer ID"
            value={customerIdInput}
            setValue={(val) => {
              setCustomerIdInput(val);
              setIsCustomerIDTyping(true);
            }}
            setFilter={setCustomerIdFilter}
            debouncedFunction={debouncedCustomerId}
            loading={isCustomerIDTyping}
          />

          <DropdownSearchInput
            label="Full Name"
            value={fullNameInput}
            setValue={setFullNameInput}
            setFilter={setFullNameFilter}
            debouncedFunction={debouncedFullName}
            loading={isFullNameLoading}
            suggestions={fullNameSuggestions?.results || []}
          />

          <DropdownSearchInput
            label="Phone Number"
            value={phoneNumberInput}
            setValue={setPhoneNumberInput}
            setFilter={setPhoneNumberFilter}
            debouncedFunction={debouncedPhoneNumber}
            loading={isPhoneLoading}
            width={160}
            suggestions={PhoneSuggestions?.results || []}
          />

          <CustomDatePicker
            label="Created At"
            value={dateInput}
            setValue={setDateInput}
            setFilter={setDateFilter}
            setPage={setPage}
          />

          <CustomDatePicker
            label="Last Order Date"
            value={lastDateInput}
            setValue={setLastDateInput}
            setFilter={setLastDateFilter}
            setPage={setPage}
          />
        </Box>

        {/* Source Buttons */}
        <Box
          display="flex"
          flexWrap="wrap"
          gap={2}
          justifyContent="space-between"
          alignItems="center"
        >
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {sourceOptions.map((option) => (
              <Button
                key={option}
                onClick={() => toggleSouceoptions(option)}
                sx={{
                  minWidth: 90,
                  height: 36,
                  fontSize: 13,
                  textTransform: "none",
                  borderRadius: "8px",
                  fontWeight: 800,
                  border: "1px solid transparent",
                  color: sourceFilter === option ? "#fff" : "#1C1C1E",
                  background: sourceFilter === option ? "#0E1B6B" : "#EDEDF0",
                  transition: "all 0.25s ease",
                  boxShadow:
                    sourceFilter === option
                      ? "0px 4px 10px rgba(0, 79, 167, 0.3)"
                      : "0px 2px 6px rgba(0,0,0,0.05)",
                  "&:hover": {
                    color: sourceFilter === option ? "#fff" : "#1C1C1E",
                    background: sourceFilter === option ? "#131C55" : "#E5E7EB",
                  },
                }}
              >
                {option}
              </Button>
            ))}
          </Box>
          {/* <Box>
            <Button
              onClick={handleExport}
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{
                height: 36,
                textTransform: "none",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              Export
            </Button>
          </Box> */}
        </Box>
        {/* <Button
          onClick={handleExport}
          startIcon={<DownloadIcon />}
          sx={{
            height: 36,
            textTransform: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: 13,
            px: 2,
            color: "#fff",
            background: "linear-gradient(135deg, #0E1B6B, #004FA7)",
            boxShadow: "0px 4px 10px rgba(0, 79, 167, 0.3)",
            transition: "all 0.25s ease",
            "&:hover": {
              background: "linear-gradient(135deg, #131C55, #003B82)",
              boxShadow: "0px 6px 14px rgba(0, 79, 167, 0.4)",
            },
            "&:active": {
              transform: "scale(0.97)",
            },
          }}
        >
          Download Excel
        </Button> */}
      </Box>

      {isLoading || isFetching ? (
        <Loader />
      ) : (
        <AgGridTable
          rowData={rowData}
          columnDefs={userCol}
          onRowClicked={onRowClicked}
          // getRowStyle={getRowStyle}
          getRowStyle={getRowStyle(highlightedId)}
          height={465}
          enablePagination
          currentPage={page}
          totalPages={data?.total_pages || 1}
          onPageChange={(newPage: any) => setPage(newPage)}
          pagination={false}
          paginationPageSize={pageSize}
          storageKey={storageKey}
          onColumnMoved={handleColumnMoved}
          onResetColumns={handleResetColumns}
          allColumnsWithVisibility={allColumnsWithVisibility}
          onToggleColumnVisibility={toggleColumnVisibility}
          onUpdateColumnsVisibility={updateColumnsVisibility}
          isVisibilityLoading={isSaving}
          onExport={handleExport}
        />
      )}
      <UserDetailsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userData={selectedUser}
      />
    </Box>
  );
};

export default DetailedInfo;
