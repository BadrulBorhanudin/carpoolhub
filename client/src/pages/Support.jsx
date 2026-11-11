import {
  Box,
  Heading,
  Text,
  Button,
  Link,
  FormControl,
  FormLabel,
  Input,
  useToast,
  VStack,
  HStack,
} from '@chakra-ui/react';
import Layout from '../components/Layout';
import { useMutation } from '@apollo/client';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';
import { CREATE_CHECKOUT_SESSION } from '../utils/mutations';

// Load Stripe outside of a component’s render to avoid recreating the Stripe object on every render.
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    'pk_test_51PJvcdBVaH1iGHeJY2P6pMwJukFJAshUZ8exvD58Yxh7IA4an6IOO8po46ekOfm3sJ66lasAiA1z6NbxGGuZZElJ00pd55a9Xr'
);

const SupportMe = () => {
  // State for managing donation amount input
  const [donationAmount, setDonationAmount] = useState('');
  const toast = useToast();

  // useMutation hook to create a checkout session
  const [createCheckoutSession, { loading, error }] = useMutation(
    CREATE_CHECKOUT_SESSION
  );

  // Handle input change, remove leading zeros
  const handleInputChange = (event) => {
    const value = event.target.value;
    const numericValue = value.replace(/^0+/, '');
    setDonationAmount(numericValue);
  };

  // Handle form submission to create a Stripe checkout session
  const handleClick = async (event) => {
    event.preventDefault();
    try {
      const { data } = await createCheckoutSession({
        variables: { donationAmount: parseFloat(donationAmount) },
      });
      const stripe = await stripePromise;
      const result = await stripe.redirectToCheckout({
        sessionId: data.createCheckoutSession.id,
      });
      if (result.error) {
        console.error(result.error.message);
        toast({
          title: 'Error',
          description: 'There was an error processing your donation.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'There was an error creating the checkout session.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Layout>
      <Box
        mt={4}
        p={6}
        borderWidth='1px'
        borderRadius='3xl'
        borderColor='gray.300'
        bg='whitesmoke'
      >
        <Heading as='h1' size='xl' mb={6} textAlign='center'>
          Support Me
        </Heading>
        <Text fontSize='lg' mb={6} textAlign='justify'>
          Thank you for considering supporting CarPoolHub! Your support helps me
          continue to provide a reliable and convenient ride-sharing platform
          for everyone.
        </Text>
        <VStack spacing={6}>
          <Box textAlign='center'>
            <Heading as='h2' size='lg' mb={2}>
              Donations
            </Heading>
            <Text fontSize='lg' textAlign='justify'>
              If you find my service valuable, consider making a donation. Your
              contributions will help me maintain and improve the platform,
              ensuring a seamless experience for all users.
            </Text>
          </Box>
          <FormControl>
            <HStack>
              <FormLabel htmlFor='donationAmount' mb='0' whiteSpace='nowrap'>
                Donation Amount ($):
              </FormLabel>
              <Input
                rounded={'full'}
                id='donationAmount'
                type='number'
                min='0'
                value={donationAmount}
                onChange={handleInputChange}
                onBlur={() => {
                  if (donationAmount === '') setDonationAmount('0');
                }}
                onFocus={() => {
                  if (donationAmount === '0') setDonationAmount('');
                }}
              />
            </HStack>
          </FormControl>
          <Button
            isLoading={loading}
            loadingText='Processing'
            colorScheme='blue'
            size='lg'
            rounded='full'
            onClick={handleClick}
            disabled={parseFloat(donationAmount) <= 0}
          >
            Donate via Stripe
          </Button>
          <Box textAlign='center'>
            <Heading as='h2' size='lg' mb={2}>
              Spread the Word
            </Heading>
            <Text fontSize='lg' textAlign='justify'>
              Share CarPoolHub with your friends and family. The more people use
              the platform, the better it becomes for everyone.
            </Text>
          </Box>
          <Box textAlign='center'>
            <Heading as='h2' size='lg' mb={2}>
              Feedback
            </Heading>
            <Text fontSize='lg' mb={4} textAlign='justify'>
              I am always looking to improve. If you have any suggestions or
              feedback, please don't hesitate to let me know. Your input is
              invaluable.
            </Text>
            <Button colorScheme='blue' size='lg' rounded='full'>
              <Link href='mailto:badrulborhanudin@gmail.com' isExternal>
                Send Feedback
              </Link>
            </Button>
          </Box>
        </VStack>
      </Box>
    </Layout>
  );
};

export default SupportMe;
